import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { adminAuthMiddleware, requireRole } from '../middleware/adminAuth';
import { stringify } from 'csv-stringify/sync';
import { executeQuestionLaunch, closePollLaunch } from '../services/launchService';

console.log('>>> admin.ts loaded');

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const QuestionSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(5),
  correctIndex: z.number().int().min(0).max(4),
  timerSeconds: z.number().int().min(5).max(300),
  scheduledAt: z.string().datetime().optional().nullable(),
});

// POST /api/admin/login
router.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  try {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const secret = process.env.ADMIN_JWT_SECRET!;
    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role },
      secret,
      { expiresIn: '8h' }
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    res.json({ message: 'Logged in', email: admin.email, role: admin.role });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/logout
router.post('/logout', adminAuthMiddleware, (_req: Request, res: Response) => {
  res.clearCookie('admin_token');
  res.json({ message: 'Logged out' });
});

// GET /api/admin/me
router.get('/me', adminAuthMiddleware, (req: Request, res: Response) => {
  console.log('>>> /me handler hit');
  const admin = (req as any).admin;
  res.json({ id: admin.adminId, email: admin.email, role: admin.role });
});

// GET /api/admin/admins
router.get('/admins', requireRole('SUPER_ADMIN'), async (_req: Request, res: Response) => {
  try {
    const admins = await prisma.admin.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(admins);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

const AdminCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']),
});

// POST /api/admin/admins
router.post('/admins', requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  const parsed = AdminCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const existing = await prisma.admin.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const admin = await prisma.admin.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    res.json(admin);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

const AdminRoleSchema = z.object({
  role: z.enum(['ADMIN', 'SUPER_ADMIN']),
});

// PATCH /api/admin/admins/:id/role
router.patch('/admins/:id/role', requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  const parsed = AdminRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const id = req.params.id as string;
    const updated = await prisma.admin.update({
      where: { id },
      data: { role: parsed.data.role },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    res.json(updated);
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Admin not found' });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/admins/:id
router.delete('/admins/:id', requireRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.admin.delete({
      where: { id },
    });
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Admin not found' });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/questions
router.get('/questions', adminAuthMiddleware, async (req: Request, res: Response) => {
  const { status, date } = req.query;
  try {
    const where: any = {};
    if (status) where.status = status;
    if (date) {
      const d = new Date(date as string);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.createdAt = { gte: d, lt: next };
    }
    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { launches: true } },
        launches: {
          select: { id: true, launchedAt: true, closedAt: true },
        },
      },
    });
    res.json(questions);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/questions — create DRAFT
router.post('/questions', adminAuthMiddleware, async (req: Request, res: Response) => {
  const adminId = (req as any).admin?.adminId;
  const parsed = QuestionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const { text, options, correctIndex, timerSeconds, scheduledAt } = parsed.data;
  if (correctIndex >= options.length) {
    res.status(400).json({ error: 'correctIndex out of range' });
    return;
  }

  try {
    const q = await prisma.question.create({
      data: {
        text,
        options,
        correctIndex,
        timerSeconds,
        scheduledAt,
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
        createdById: adminId,
      },
    });
    res.status(201).json(q);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/questions/:id — edit DRAFT
// Guard: question must have never been launched (launches.length === 0)
router.put('/questions/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const parsed = QuestionSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  try {
    const existing = await prisma.question.findUnique({
      where: { id },
      include: { launches: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    if (existing.launches.length > 0) {
      res.status(409).json({ error: 'Question cannot be edited because it has already been launched' });
      return;
    }

    // Determine new status based on existing or incoming scheduledAt
    const incomingScheduledAt = parsed.data.scheduledAt;
    const finalScheduledAt = incomingScheduledAt !== undefined ? incomingScheduledAt : existing.scheduledAt;
    const newStatus = finalScheduledAt ? 'SCHEDULED' : 'DRAFT';

    const updated = await prisma.question.update({
      where: { id },
      data: { ...parsed.data, status: newStatus }
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/questions/:id/launch
router.post('/questions/:id/launch', adminAuthMiddleware, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const adminId = (req as any).admin?.adminId;

  try {
    const question = await prisma.question.findUnique({ where: { id } });
    if (!question) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    if (question.status === 'LIVE') {
      res.status(400).json({ error: 'Question is already live' });
      return;
    }

    const result = await executeQuestionLaunch(id, adminId);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/launches/:launchId/close — Phase 7A: manually close a specific launch
// Idempotent: closing an already-closed launch is safe.
// Isolated: only the specified launch is closed; other launches are unaffected.
router.post('/launches/:launchId/close', adminAuthMiddleware, async (req: Request, res: Response) => {
  const launchId = req.params.launchId as string;

  try {
    const result = await closePollLaunch(launchId);
    if (result === null) {
      res.status(404).json({ error: 'Launch not found' });
      return;
    }
    res.json({
      message: result.closedAt ? 'Launch closed' : 'Launch was already closed',
      launch: {
        id: result.id,
        questionId: result.questionId,
        launchedAt: result.launchedAt,
        closedAt: result.closedAt,
      },
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/admin/stats — aggregate per PollLaunch
router.get('/stats', adminAuthMiddleware, async (_req: Request, res: Response) => {
  try {
    const launches = await prisma.pollLaunch.findMany({
      orderBy: { launchedAt: 'desc' },
      include: {
        question: true,
        attempts: true,
      },
    });

    const stats = launches.map((l) => {
      const totalAttempts = l.attempts.length;
      const correctCount = l.attempts.filter((a) => a.result === 'CORRECT').length;
      const wrongCount = l.attempts.filter((a) => a.result === 'WRONG').length;
      const timeoutCount = l.attempts.filter((a) => a.result === 'TIMEOUT').length;
      const timings = l.attempts.filter((a) => a.timeTakenMs != null).map((a) => a.timeTakenMs!);
      const avgTimeTakenMs = timings.length > 0
        ? Math.round(timings.reduce((s, t) => s + t, 0) / timings.length)
        : null;

      return {
        pollLaunchId: l.id,
        questionId: l.questionId,
        date: l.launchedAt.toISOString().split('T')[0],
        launchedAt: l.launchedAt.toISOString(),
        closedAt: l.closedAt?.toISOString() ?? null,
        questionText: l.question.text,
        status: l.closedAt ? 'CLOSED' : l.question.status,
        totalAttempts,
        correctCount,
        wrongCount,
        timeoutCount,
        avgTimeTakenMs,
      };
    });

    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/stats/:pollLaunchId — breakdown for one specific launch
router.get('/stats/:pollLaunchId', adminAuthMiddleware, async (req: Request, res: Response) => {
  const pollLaunchId = req.params.pollLaunchId as string;
  try {
    const l = await prisma.pollLaunch.findUnique({
      where: { id: pollLaunchId },
      include: {
        question: true,
        attempts: true,
      },
    });
    if (!l) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const totalAttempts = l.attempts.length;
    const correctCount = l.attempts.filter((a) => a.result === 'CORRECT').length;
    const wrongCount = l.attempts.filter((a) => a.result === 'WRONG').length;
    const timeoutCount = l.attempts.filter((a) => a.result === 'TIMEOUT').length;
    const timings = l.attempts.filter((a) => a.timeTakenMs != null).map((a) => a.timeTakenMs!);
    const avgTimeTakenMs = timings.length > 0
      ? Math.round(timings.reduce((s, t) => s + t, 0) / timings.length)
      : null;

    res.json({
      pollLaunchId: l.id,
      questionId: l.questionId,
      date: l.launchedAt.toISOString().split('T')[0],
      launchedAt: l.launchedAt.toISOString(),
      closedAt: l.closedAt?.toISOString() ?? null,
      questionText: l.question.text,
      options: l.question.options,
      correctIndex: l.question.correctIndex,
      status: l.closedAt ? 'CLOSED' : l.question.status,
      totalAttempts,
      correctCount,
      wrongCount,
      timeoutCount,
      avgTimeTakenMs,
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/questions/:id/export.csv (also /admin/questions/:id/export.csv)
router.get('/questions/:id/export.csv', adminAuthMiddleware, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const question = await prisma.question.findUnique({
      where: { id },
    });
    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    const launches = await prisma.pollLaunch.findMany({
      where: { questionId: id },
      orderBy: { launchedAt: 'asc' },
      include: {
        attempts: {
          orderBy: { submittedAt: 'asc' },
          include: {
            student: {
              select: { nickname: true },
            },
          },
        },
      },
    });

    const rows = launches.flatMap((l) =>
      l.attempts.map((a) => ({
        'student nickname': a.student.nickname,
        pollLaunchId: l.id,
        launchedAt: l.launchedAt.toISOString(),
        isCorrect: a.result === 'CORRECT',
        timeTakenMs: a.timeTakenMs ?? '',
        submittedAt: a.submittedAt.toISOString(),
      }))
    );

    const csv = stringify(rows, {
      header: true,
      columns: [
        'student nickname',
        'pollLaunchId',
        'launchedAt',
        'isCorrect',
        'timeTakenMs',
        'submittedAt',
      ],
      cast: {
        boolean: (value) => (value ? 'true' : 'false'),
      },
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="question-${id}-attempts.csv"`);
    res.send(csv);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

