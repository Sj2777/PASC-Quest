import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { studentAuthMiddleware, optionalStudentAuth } from '../middleware/studentAuth';
import { updateStreakOnCorrectAttempt } from '../services/streakService';
import { LAUNCH_LIFETIME_MS } from '../services/launchService';
import { broadcastLeaderboardUpdate } from '../websocket';

const router = Router();

interface StartTokenPayload {
  pollLaunchId: string;
  studentId: string;
  startedAt: number; // unix ms
}

// GET /api/poll/current — public/unauthenticated
// Phase 7C-A: Returns ALL currently available PollLaunches as an array.
// An empty array means no questions are currently available.
// Each launch is included only when ALL of:
//   1. PollLaunch.closedAt is null (not manually closed)
//   2. PollLaunch.launchedAt <= now  (launch has actually started)
//   3. PollLaunch.launchedAt >  now - 24h  (within its lifetime window)
//   4. parent Question.status === LIVE
// Ordered: newest launchedAt first.
router.get('/current', optionalStudentAuth, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - LAUNCH_LIFETIME_MS);

    const launches = await prisma.pollLaunch.findMany({
      where: {
        closedAt: null,
        launchedAt: { gt: windowStart, lte: now }, // within [now-24h, now]
        question: { status: 'LIVE' },              // parent Question must be LIVE
      },
      orderBy: { launchedAt: 'desc' },
      include: { question: true },
    });

    const studentId = (req as any).studentId as string | undefined;
    const completedSet = new Set<string>();

    if (studentId && launches.length > 0) {
      const attempts = await prisma.attempt.findMany({
        where: {
          studentId,
          pollLaunchId: { in: launches.map((l) => l.id) },
        },
        select: { pollLaunchId: true },
      });
      for (const a of attempts) {
        completedSet.add(a.pollLaunchId);
      }
    }

    const items = launches.map((l) => ({
      pollLaunchId: l.id,
      questionId: l.question.id,
      text: l.question.text,
      options: l.question.options,
      timerSeconds: l.question.timerSeconds,
      launchedAt: l.launchedAt.toISOString(),
      expiresAt: new Date(l.launchedAt.getTime() + LAUNCH_LIFETIME_MS).toISOString(),
      completed: completedSet.has(l.id),
      points: l.question.points,
      // correctIndex is intentionally omitted
    }));

    res.json(items);
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

    // Phase 7A (corrected): reject if the launch is inactive for ANY of these reasons:
    //   - does not exist
    //   - manually closed (closedAt is set)
    //   - has not yet started (launchedAt > now)  — structurally impossible via production
    //     API but guarded here for defence-in-depth
    //   - 24-hour window has elapsed (now >= launchedAt + 24h)
    //   - parent Question is not LIVE  — defence-in-depth; also guards against a launch
    //     whose question was force-closed outside normal flow
    const now = Date.now();
    const hasStarted   = launch ? launch.launchedAt.getTime() <= now : false;
    const withinWindow = launch ? now < launch.launchedAt.getTime() + LAUNCH_LIFETIME_MS : false;
    const questionLive = launch?.question.status === 'LIVE';

    if (!launch || launch.closedAt !== null || !hasStarted || !withinWindow || !questionLive) {
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

    const awardedPoints = result === 'CORRECT' ? q.points : 0;

    // Create the attempt with pollLaunchId + studentId
    await prisma.attempt.create({
      data: {
        pollLaunchId: launch.id,
        studentId,
        selectedOption,
        result,
        timeTakenMs: elapsed,
        awardedPoints,
      },
    });

    if (result === 'CORRECT') {
      await updateStreakOnCorrectAttempt(studentId);
    }

    // Broadcast leaderboard updates (WebSocket Phase 1)
    broadcastLeaderboardUpdate('overall');
    broadcastLeaderboardUpdate('poll', launch.id);

    res.json({ result: result.toLowerCase(), correctIndex: q.correctIndex, awardedPoints });
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

// GET /api/poll/:pollLaunchId/ghost — requires student authentication
// Returns aggregate statistics for a specific poll launch
router.get('/:pollLaunchId/ghost', studentAuthMiddleware, async (req: Request, res: Response) => {
  const pollLaunchId = req.params.pollLaunchId as string;

  try {
    const attempts = await prisma.attempt.findMany({
      where: { pollLaunchId },
      select: { result: true }
    });

    const total = attempts.length;
    
    if (total === 0) {
      return res.json({
        total: 0,
        correct: 0,
        wrong: 0,
        timeout: 0,
        correctPercent: 0,
        wrongPercent: 0,
        timeoutPercent: 0
      });
    }

    let correct = 0;
    let wrong = 0;
    let timeout = 0;

    for (const a of attempts) {
      if (a.result === 'CORRECT') correct++;
      else if (a.result === 'WRONG') wrong++;
      else if (a.result === 'TIMEOUT') timeout++;
    }

    res.json({
      total,
      correct,
      wrong,
      timeout,
      correctPercent: (correct / total) * 100,
      wrongPercent: (wrong / total) * 100,
      timeoutPercent: (timeout / total) * 100
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
