import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { formatIstDate } from '../lib/dateUtils';

const router = Router();

// GET /api/leaderboards/branch-battle
// Calculates weekly accuracy per branch
router.get('/branch-battle', async (req: Request, res: Response) => {
  try {
    // Current week: Monday to Sunday in IST
    const now = new Date();
    const currentIst = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const dayOfWeek = currentIst.getUTCDay(); // 0 = Sunday, 1 = Monday
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    // Start of Monday
    const monday = new Date(currentIst.getTime());
    monday.setUTCDate(monday.getUTCDate() - diffToMonday);
    monday.setUTCHours(0, 0, 0, 0);

    // Convert back to UTC for DB query
    const mondayUtc = new Date(monday.getTime() - 5.5 * 60 * 60 * 1000);

    const attempts = await prisma.attempt.findMany({
      where: {
        submittedAt: { gte: mondayUtc }
      },
      include: {
        student: { select: { branch: true } }
      }
    });

    const branchStats = new Map<string, { total: number; correct: number }>();

    for (const attempt of attempts) {
      const branch = attempt.student.branch;
      if (!branch) continue;

      if (!branchStats.has(branch)) {
        branchStats.set(branch, { total: 0, correct: 0 });
      }
      
      const stats = branchStats.get(branch)!;
      stats.total += 1;
      if (attempt.result === 'CORRECT') {
        stats.correct += 1;
      }
    }

    const leaderboard = Array.from(branchStats.entries()).map(([branch, stats]) => {
      return {
        branch,
        accuracy: Math.round((stats.correct / stats.total) * 1000) / 10,
        totalAttempts: stats.total
      };
    });

    // Sort by accuracy descending, then total attempts descending
    leaderboard.sort((a, b) => {
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return b.totalAttempts - a.totalAttempts;
    });

    res.json({ leaderboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leaderboards/hall-of-fame
// Returns top 10 students by bestStreak
router.get('/hall-of-fame', async (req: Request, res: Response) => {
  try {
    const topStreakers = await prisma.student.findMany({
      orderBy: [
        { bestStreak: 'desc' },
        { id: 'asc' }
      ],
      take: 10,
      select: {
        id: true,
        nickname: true,
        bestStreak: true,
        currentStreak: true,
        branch: true
      },
      where: {
        bestStreak: { gt: 0 } // Only show people with at least a streak of 1
      }
    });

    res.json({ hallOfFame: topStreakers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leaderboards/speed-king
// Returns the student with the fastest correct attempt submitted today (IST)
router.get('/speed-king', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    // Shift by +5:30 to get current IST time
    const currentIst = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    
    // Start of today in IST
    const todayStartIst = new Date(currentIst);
    todayStartIst.setUTCHours(0, 0, 0, 0);

    // Tomorrow start in IST
    const tomorrowStartIst = new Date(todayStartIst);
    tomorrowStartIst.setUTCDate(tomorrowStartIst.getUTCDate() + 1);

    // Convert back to UTC for database queries
    const todayStartUtc = new Date(todayStartIst.getTime() - 5.5 * 60 * 60 * 1000);
    const tomorrowStartUtc = new Date(tomorrowStartIst.getTime() - 5.5 * 60 * 60 * 1000);

    const speedKingAttempt = await prisma.attempt.findFirst({
      where: {
        submittedAt: {
          gte: todayStartUtc,
          lt: tomorrowStartUtc
        },
        result: 'CORRECT',
        timeTakenMs: { not: null }
      },
      orderBy: [
        { timeTakenMs: 'asc' },
        { submittedAt: 'asc' } // deterministic secondary sort: whoever achieved the fast time first wins
      ],
      include: {
        student: { select: { nickname: true } }
      }
    });

    if (!speedKingAttempt) {
      return res.json({ speedKing: null });
    }

    return res.json({
      speedKing: {
        nickname: speedKingAttempt.student.nickname,
        timeTakenMs: speedKingAttempt.timeTakenMs!,
        submittedAt: speedKingAttempt.submittedAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
