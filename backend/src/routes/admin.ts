import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { adminAuthMiddleware } from '../middleware/adminAuth';

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
    const token = jwt.sign({ adminId: admin.id, email: admin.email }, secret, { expiresIn: '8h' });

    res.cookie('admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    res.json({ message: 'Logged in', email: admin.email });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/logout
router.post('/logout', adminAuthMiddleware, (_req: Request, res: Response) => {
  res.clearCookie('admin_token');
  res.json({ message: 'Logged out' });
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
      include: { _count: { select: { attempts: true } } },
    });
    res.json(questions);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/questions — create DRAFT
router.post('/questions', adminAuthMiddleware, async (req: Request, res: Response) => {
  const parsed = QuestionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const { text, options, correctIndex, timerSeconds } = parsed.data;
  if (correctIndex >= options.length) {
    res.status(400).json({ error: 'correctIndex out of range' });
    return;
  }

  try {
    const q = await prisma.question.create({
      data: { text, options, correctIndex, timerSeconds, status: 'DRAFT' },
    });
    res.status(201).json(q);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/questions/:id — edit DRAFT
router.put('/questions/:id', adminAuthMiddleware, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const parsed = QuestionSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  try {
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
    if (existing.status !== 'DRAFT') {
      res.status(400).json({ error: 'Only DRAFT questions can be edited' });
      return;
    }
    const updated = await prisma.question.update({ where: { id }, data: parsed.data });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/questions/:id/launch
router.post('/questions/:id/launch', adminAuthMiddleware, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const question = await prisma.question.findUnique({ where: { id } });
    if (!question) { res.status(404).json({ error: 'Not found' }); return; }
    if (question.status === 'LIVE') {
      res.status(400).json({ error: 'Question is already live' });
      return;
    }

    // Transaction: close existing LIVE question, launch this one
    const result = await prisma.$transaction(async (tx) => {
      await tx.question.updateMany({
        where: { status: 'LIVE' },
        data: { status: 'CLOSED' },
      });
      const launched = await tx.question.update({
        where: { id },
        data: { status: 'LIVE', liveDate: new Date() },
      });
      return launched;
    });

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/stats
router.get('/stats', adminAuthMiddleware, async (_req: Request, res: Response) => {
  try {
    const questions = await prisma.question.findMany({
      where: { status: { in: ['LIVE', 'CLOSED'] } },
      orderBy: { liveDate: 'desc' },
      include: { attempts: true },
    });

    const stats = questions.map((q) => {
      const totalAttempts = q.attempts.length;
      const correctCount = q.attempts.filter((a) => a.result === 'CORRECT').length;
      const wrongCount = q.attempts.filter((a) => a.result === 'WRONG').length;
      const timeoutCount = q.attempts.filter((a) => a.result === 'TIMEOUT').length;
      const timings = q.attempts.filter((a) => a.timeTakenMs != null).map((a) => a.timeTakenMs!);
      const avgTimeTakenMs = timings.length > 0
        ? Math.round(timings.reduce((s, t) => s + t, 0) / timings.length)
        : null;

      return {
        questionId: q.id,
        date: q.liveDate?.toISOString().split('T')[0] ?? null,
        questionText: q.text,
        status: q.status,
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

// GET /api/admin/stats/:questionId
router.get('/stats/:questionId', adminAuthMiddleware, async (req: Request, res: Response) => {
  const questionId = req.params.questionId as string;
  try {
    const q = await prisma.question.findUnique({
      where: { id: questionId },
      include: { attempts: true },
    });
    if (!q) { res.status(404).json({ error: 'Not found' }); return; }

    const totalAttempts = q.attempts.length;
    const correctCount = q.attempts.filter((a) => a.result === 'CORRECT').length;
    const wrongCount = q.attempts.filter((a) => a.result === 'WRONG').length;
    const timeoutCount = q.attempts.filter((a) => a.result === 'TIMEOUT').length;
    const timings = q.attempts.filter((a) => a.timeTakenMs != null).map((a) => a.timeTakenMs!);
    const avgTimeTakenMs = timings.length > 0
      ? Math.round(timings.reduce((s, t) => s + t, 0) / timings.length)
      : null;

    res.json({
      questionId: q.id,
      date: q.liveDate?.toISOString().split('T')[0] ?? null,
      questionText: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      status: q.status,
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

export default router;
