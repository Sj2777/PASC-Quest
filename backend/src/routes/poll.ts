import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { ensureAnonId } from '../middleware/anonId';

const router = Router();

// All poll routes get the anon_id middleware
router.use(ensureAnonId);

interface StartTokenPayload {
  questionId: string;
  anonId: string;
  startedAt: number; // unix ms
}

// GET /api/poll/current
router.get('/current', async (req: Request, res: Response) => {
  try {
    const q = await prisma.question.findFirst({ where: { status: 'LIVE' } });
    if (!q) {
      res.json({ status: 'none' });
      return;
    }
    res.json({
      status: 'live',
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

// POST /api/poll/:questionId/start
router.post('/:questionId/start', async (req: Request, res: Response) => {
  const questionId = req.params.questionId as string;
  const anonId: string = (req as any).anonId;

  const StartSchema = z.object({ nickname: z.string().min(1).max(50) });
  const parsed = StartSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Nickname required' });
    return;
  }
  const { nickname: _nickname } = parsed.data;

  try {
    // Check question exists and is LIVE
    const q = await prisma.question.findUnique({ where: { id: questionId } });
    if (!q || q.status !== 'LIVE') {
      res.status(404).json({ error: 'No live question found' });
      return;
    }

    // Check if already played
    const existing = await prisma.attempt.findUnique({
      where: { anonId_questionId: { anonId, questionId } },
    });
    if (existing) {
      res.status(409).json({ reason: 'already_played' });
      return;
    }

    // Issue start token
    const payload: StartTokenPayload = {
      questionId,
      anonId,
      startedAt: Date.now(),
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: `${q.timerSeconds + 30}s` });

    res.json({ token, timerSeconds: q.timerSeconds });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/poll/attempts
router.post('/attempts', async (req: Request, res: Response) => {
  const anonId: string = (req as any).anonId;

  const AttemptSchema = z.object({
    token: z.string(),
    nickname: z.string().min(1).max(50),
    selectedOption: z.number().int().min(0).max(4).nullable(),
  });
  const parsed = AttemptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const { token, nickname, selectedOption } = parsed.data;

  let payload: StartTokenPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as StartTokenPayload;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Verify anonId matches the token (prevents token theft across browsers)
  if (payload.anonId !== anonId) {
    res.status(403).json({ error: 'Token mismatch' });
    return;
  }

  try {
    const q = await prisma.question.findUnique({ where: { id: payload.questionId } });
    if (!q) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

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

    // Upsert the attempt (the @@unique constraint prevents double-play)
    await prisma.attempt.create({
      data: {
        questionId: q.id,
        anonId,
        nickname,
        selectedOption,
        result,
        timeTakenMs: elapsed,
      },
    });

    res.json({ result: result.toLowerCase(), correctIndex: q.correctIndex });
  } catch (err: any) {
    // Prisma unique constraint violation
    if (err?.code === 'P2002') {
      res.status(409).json({ reason: 'already_played' });
      return;
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/poll/:questionId/leaderboard
router.get('/:questionId/leaderboard', async (req: Request, res: Response) => {
  const questionId = req.params.questionId as string;
  const anonId: string | undefined = (req as any).anonId;

  try {
    const q = await prisma.question.findUnique({ where: { id: questionId } });
    if (!q) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    // Fetch all attempts for this question
    const attempts = await prisma.attempt.findMany({
      where: { questionId },
      select: {
        anonId: true,
        nickname: true,
        result: true,
        timeTakenMs: true,
        submittedAt: true,
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
      nickname: a.nickname,
      result: a.result.toLowerCase() as 'correct' | 'wrong' | 'timeout',
      timeTakenMs: a.timeTakenMs,
      isMe: a.anonId === anonId,
    }));

    const top10 = ranked.slice(0, 10);

    // Find caller's entry
    const myEntry = anonId ? ranked.find((r) => r.isMe) ?? null : null;

    res.json({
      questionId,
      questionText: q.text,
      questionStatus: q.status.toLowerCase(), // 'live' | 'closed' | 'draft'
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

