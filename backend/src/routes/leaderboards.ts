import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { formatIstDate } from '../lib/dateUtils';
import { optionalStudentAuth } from '../middleware/studentAuth';

const router = Router();

// GET /api/leaderboards/overall
// New Overall Leaderboard for Phase 2B
router.get('/overall', optionalStudentAuth, async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || 'all-time';

    if (!['daily', 'weekly', 'all-time'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const now = new Date();
    const currentIst = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    
    let startDateUtc: Date | undefined;

    if (period === 'daily') {
      const startOfIstDay = new Date(Date.UTC(
        currentIst.getUTCFullYear(),
        currentIst.getUTCMonth(),
        currentIst.getUTCDate(),
        0, 0, 0, 0
      ));
      startDateUtc = new Date(startOfIstDay.getTime() - 5.5 * 60 * 60 * 1000);
    } else if (period === 'weekly') {
      const dayOfWeek = currentIst.getUTCDay(); // 0 = Sunday, 1 = Monday
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfIstWeek = new Date(Date.UTC(
        currentIst.getUTCFullYear(),
        currentIst.getUTCMonth(),
        currentIst.getUTCDate() - diffToMonday,
        0, 0, 0, 0
      ));
      startDateUtc = new Date(startOfIstWeek.getTime() - 5.5 * 60 * 60 * 1000);
    }

    const where: any = {};
    if (startDateUtc) {
      where.submittedAt = { gte: startDateUtc };
    }

    const attemptStats = await prisma.attempt.groupBy({
      by: ['studentId'],
      where,
      _sum: { awardedPoints: true, timeTakenMs: true },
      _count: { timeTakenMs: true }
    });

    if (attemptStats.length === 0) {
      return res.json({ period, entries: [] });
    }

    const studentIds = attemptStats.map(s => s.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, nickname: true, currentStreak: true }
    });
    
    const studentMap = new Map();
    for (const s of students) {
      studentMap.set(s.id, s);
    }

    const entries = attemptStats.map(stat => {
      const student = studentMap.get(stat.studentId);
      if (!student) return null;

      const score = stat._sum.awardedPoints ?? 0;
      const totalTimeMs = stat._sum.timeTakenMs ?? 0;
      const timeCount = stat._count.timeTakenMs ?? 0;
      
      const averageTimeMsRaw = timeCount > 0 ? totalTimeMs / timeCount : Number.MAX_SAFE_INTEGER;
      
      return {
        id: student.id,
        nickname: student.nickname,
        score,
        currentStreak: student.currentStreak,
        averageTimeMsRaw,
        averageTimeMs: timeCount > 0 ? Math.round(averageTimeMsRaw) : null
      };
    }).filter(e => e !== null);

    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
      if (a.averageTimeMsRaw !== b.averageTimeMsRaw) return a.averageTimeMsRaw - b.averageTimeMsRaw;
      return a.id.localeCompare(b.id);
    });

    const top10 = entries.slice(0, 10).map((e, index) => ({
      rank: index + 1,
      nickname: e.nickname,
      score: e.score,
      currentStreak: e.currentStreak,
      averageTimeMs: e.averageTimeMs
    }));

    res.json({
      period,
      entries: top10
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

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

// GET /api/leaderboards/:pollLaunchId/speed-king
// Returns the student with the fastest correct attempt for this specific poll launch
router.get('/:pollLaunchId/speed-king', async (req: Request, res: Response) => {
  try {
    const pollLaunchId = req.params.pollLaunchId as string;
    const speedKingAttempt = await prisma.attempt.findFirst({
      where: {
        pollLaunchId,
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
