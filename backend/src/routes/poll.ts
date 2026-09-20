import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { studentAuthMiddleware, optionalStudentAuth } from '../middleware/studentAuth';

const router = Router();

interface StartTokenPayload {
  pollLaunchId: string;
  studentId: string;
  startedAt: number; // unix ms
}

// GET /api/poll/current — public/unauthenticated
router.get('/current', async (_req: Request, res: Response) => {
  try {
    const q = await prisma.question.findFirst({ where: { status: 'LIVE' } });
    if (!q) {
      res.json({ status: 'none' });
      return;
    }

    // Find active PollLaunch for the LIVE question
    const launch = await prisma.pollLaunch.findFirst({
      where: {
        questionId: q.id,
        closedAt: null,
      },
      orderBy: { launchedAt: 'desc' },
    });

    if (!launch) {
      res.json({ status: 'none' });
      return;
    }

    res.json({
      status: 'live',
      pollLaunchId: launch.id,
      questionId: q.id,
      text: q.text,
      options: q.options,
      timerSeconds: q.timerSeconds,
      // correctIndex is intentionally omitted
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/poll/:pollLaunchId/start — requires student authentication
router.post('/:pollLaunchId/start', studentAuthMiddleware, async (req: Request, res: Response) => {
  const pollLaunchId = req.params.pollLaunchId as string;
  const studentId = (req as any).studentId as string;

  try {
    // Look up PollLaunch and join to Question
    const launch = await prisma.pollLaunch.findUnique({
      where: { id: pollLaunchId },
      include: { question: true },
    });

    if (!launch || launch.closedAt !== null || launch.question.status !== 'LIVE') {
      res.status(404).json({ error: 'No active poll launch found' });
      return;
    }

    // Check if already played via unique constraint [studentId, pollLaunchId]
    const existing = await prisma.attempt.findUnique({
      where: {
        studentId_pollLaunchId: {
          studentId,
          pollLaunchId,
        },
      },
    });

    if (existing) {
      res.status(409).json({ reason: 'already_played' });
      return;
    }

    // Issue start token with pollLaunchId, studentId, startedAt
    const payload: StartTokenPayload = {
      pollLaunchId,
      studentId,
      startedAt: Date.now(),
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: `${launch.question.timerSeconds + 30}s`,
    });

    res.json({ token, timerSeconds: launch.question.timerSeconds });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/poll/attempts — requires student authentication
router.post('/attempts', studentAuthMiddleware, async (req: Request, res: Response) => {
  const studentId = (req as any).studentId as string;

  const AttemptSchema = z.object({
    token: z.string(),
    nickname: z.string().optional(),
    selectedOption: z.number().int().min(0).max(4).nullable(),
  });
  const parsed = AttemptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const { token, selectedOption } = parsed.data;

  let payload: StartTokenPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as StartTokenPayload;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Verify studentId matches the token (prevents token theft across students)
  if (payload.studentId !== studentId) {
    res.status(403).json({ error: 'Token mismatch' });
    return;
  }

  try {
    const launch = await prisma.pollLaunch.findUnique({
      where: { id: payload.pollLaunchId },
      include: { question: true },
    });
    if (!launch) {
      res.status(404).json({ error: 'Poll launch not found' });
      return;
    }

    const q = launch.question;
    const now = Date.now();
    const elapsed = now - payload.startedAt;
    const timeLimitMs = q.timerSeconds * 1000;

    // Server-side result determination
    let result: 'CORRECT' | 'WRONG' | 'TIMEOUT';
    if (elapsed > timeLimitMs || selectedOption === null) {
      result = 'TIMEOUT';
    } else if (selectedOption === q.correctIndex) {
      result = 'CORRECT';
    } else {
      result = 'WRONG';
    }

    // Create the attempt with pollLaunchId + studentId
    await prisma.attempt.create({
      data: {
        pollLaunchId: launch.id,
        studentId,
        selectedOption,
        result,
        timeTakenMs: elapsed,
      },
    });

    res.json({ result: result.toLowerCase(), correctIndex: q.correctIndex });
  } catch (err: any) {
    // Prisma unique constraint violation [studentId, pollLaunchId]
    if (err?.code === 'P2002') {
      res.status(409).json({ reason: 'already_played' });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/poll/:pollLaunchId/leaderboard — public/unauthenticated (optional studentAuth for isMe)
router.get('/:pollLaunchId/leaderboard', optionalStudentAuth, async (req: Request, res: Response) => {
  const pollLaunchId = req.params.pollLaunchId as string;
  const studentId = (req as any).studentId as string | undefined;

  try {
    const launch = await prisma.pollLaunch.findUnique({
      where: { id: pollLaunchId },
      include: { question: true },
    });
    if (!launch) {
      res.status(404).json({ error: 'Poll launch not found' });
      return;
    }

    // Fetch all attempts for this PollLaunch
    const attempts = await prisma.attempt.findMany({
      where: { pollLaunchId },
      include: {
        student: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    // Sort: CORRECT first → timeTakenMs ascending → submittedAt ascending (tie-break)
    const sorted = [...attempts].sort((a, b) => {
      const rankResult = (r: string) => (r === 'CORRECT' ? 0 : r === 'WRONG' ? 1 : 2);
      const rDiff = rankResult(a.result) - rankResult(b.result);
      if (rDiff !== 0) return rDiff;
      // Both same result bucket — sort by speed
      if (a.timeTakenMs == null && b.timeTakenMs == null) return 0;
      if (a.timeTakenMs == null) return 1;
      if (b.timeTakenMs == null) return -1;
      if (a.timeTakenMs !== b.timeTakenMs) return a.timeTakenMs - b.timeTakenMs;
      return a.submittedAt.getTime() - b.submittedAt.getTime();
    });

    // Assign ranks
    const ranked = sorted.map((a, i) => ({
      rank: i + 1,
      nickname: a.student.nickname,
      result: a.result.toLowerCase() as 'correct' | 'wrong' | 'timeout',
      timeTakenMs: a.timeTakenMs,
      isMe: Boolean(studentId && a.studentId === studentId),
    }));

    const top10 = ranked.slice(0, 10);

    // Find caller's entry if authenticated
    const myEntry = studentId ? ranked.find((r) => r.isMe) ?? null : null;

    res.json({
      pollLaunchId,
      questionId: launch.question.id,
      questionText: launch.question.text,
      questionStatus: launch.closedAt ? 'closed' : launch.question.status.toLowerCase(),
      total: ranked.length,
      top10,
      myRank: myEntry?.rank ?? null,
      myEntry,
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
