import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { studentAuthMiddleware } from '../middleware/studentAuth';
import { getStreakStatus } from '../services/streakService';
import { getStudentStats } from '../services/statsService';

const router = Router();

const RegisterSchema = z.object({
  nickname: z.string().min(3).max(20),
  password: z.string().min(6),
  branch: z.enum(['COMP', 'IT', 'AIDS', 'ENTC', 'EXTC']),
});

const LoginSchema = z.object({
  nickname: z.string().min(1),
  password: z.string().min(1),
});

const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const isProd = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  sameSite: isProd ? 'none' as const : 'lax' as const,
  secure: isProd,
  path: '/',
};

function setStudentCookie(res: Response, token: string) {
  res.cookie('student_token', token, {
    ...cookieOptions,
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

// POST /api/student/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const { nickname, password, branch } = parsed.data;

  try {
    // Check nickname uniqueness up front
    const existing = await prisma.student.findUnique({ where: { nickname } });
    if (existing) {
      res.status(409).json({ reason: 'nickname_taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const student = await prisma.student.create({
      data: {
        nickname,
        passwordHash,
        branch,
      },
    });

    const secret = process.env.STUDENT_JWT_SECRET!;
    const token = jwt.sign(
      { studentId: student.id, nickname: student.nickname },
      secret,
      { expiresIn: '30d' }
    );

    setStudentCookie(res, token);
    res.status(201).json({ id: student.id, nickname: student.nickname });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({ reason: 'nickname_taken' });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/student/login
router.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const { nickname, password } = parsed.data;

  try {
    const student = await prisma.student.findUnique({ where: { nickname } });
    if (!student) {
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, student.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }

    const secret = process.env.STUDENT_JWT_SECRET!;
    const token = jwt.sign(
      { studentId: student.id, nickname: student.nickname },
      secret,
      { expiresIn: '30d' }
    );

    setStudentCookie(res, token);
    res.json({ id: student.id, nickname: student.nickname });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/student/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('student_token', cookieOptions);
  res.json({ message: 'Logged out' });
});

// GET /api/student/me
router.get('/me', studentAuthMiddleware, async (req: Request, res: Response) => {
  const studentId = (req as any).studentId as string;

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        nickname: true,
        branch: true,
        currentStreak: true,
        bestStreak: true,
      },
    });

    if (!student) {
      res.status(401).json({ error: 'not_authenticated' });
      return;
    }

    res.json(student);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/student/streak-status
router.get('/streak-status', studentAuthMiddleware, async (req: Request, res: Response) => {
  const studentId = (req as any).studentId as string;
  try {
    const status = await getStreakStatus(studentId);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/student/stats
router.get('/stats', studentAuthMiddleware, async (req: Request, res: Response) => {
  const studentId = (req as any).studentId as string;
  try {
    const stats = await getStudentStats(studentId);
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
