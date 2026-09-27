import prisma from '../lib/prisma';
import { formatIstDate } from '../lib/dateUtils';
import { getStreakStatus } from './streakService';

export async function getStudentStats(studentId: string) {
  // NOTE: Pulling all attempts into memory.
  // This app's scale is a college quiz platform, not a scale that needs incremental/cached snapshots.
  // Revisit if the student count grows a lot (e.g. >10k students with 100s of attempts each).
  const allAttempts = await prisma.attempt.findMany({
    select: { studentId: true, submittedAt: true, result: true, timeTakenMs: true, awardedPoints: true },
    orderBy: { submittedAt: 'asc' }
  });

  const allStudentIds = (await prisma.student.findMany({ select: { id: true } })).map(s => s.id);
  const totalStudents = allStudentIds.length;

  const attemptsWithDate = allAttempts.map(a => ({
    ...a,
    istDateStr: formatIstDate(a.submittedAt)!
  }));

  const targetAttempts = attemptsWithDate.filter(a => a.studentId === studentId);

  // 1 & 2. Calculate accuracy and avgTimeMs
  let correctCount = 0;
  const totalAttemptsCount = targetAttempts.length;
  let totalTime = 0;
  let timeEntries = 0;
  let totalPoints = 0;

  for (const a of targetAttempts) {
    if (a.result === 'CORRECT') correctCount++;
    if (a.timeTakenMs !== null) {
      totalTime += a.timeTakenMs;
      timeEntries++;
    }
    totalPoints += a.awardedPoints;
  }

  const targetStudent = await prisma.student.findUnique({
    where: { id: studentId },
    select: { pointsSpent: true }
  });
  const netPoints = Math.max(0, totalPoints - (targetStudent?.pointsSpent ?? 0));

  let accuracy: number | null = null;
  if (totalAttemptsCount > 0) {
    accuracy = Math.round((correctCount / totalAttemptsCount) * 1000) / 10;
  } else {
    accuracy = 0;
  }

  const avgTimeMs = timeEntries > 0 ? Math.round(totalTime / timeEntries) : null;

  // 3. Streak
  const streak = await getStreakStatus(studentId);

  // 4. Rank History
  const distinctDays = Array.from(new Set(targetAttempts.map(a => a.istDateStr)));
  const rankHistory = distinctDays.map(dateStr => {
    const pastAttempts = attemptsWithDate.filter(a => a.istDateStr <= dateStr);
    
    const scores = new Map<string, number>();
    for (const sid of allStudentIds) {
      scores.set(sid, 0);
    }
    
    for (const a of pastAttempts) {
      if (a.result === 'CORRECT') {
        scores.set(a.studentId, scores.get(a.studentId)! + 1);
      }
    }

    const rankedStudents = Array.from(scores.entries()).map(([sid, score]) => ({ sid, score }));
    rankedStudents.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.sid.localeCompare(b.sid);
    });

    const rankIndex = rankedStudents.findIndex(r => r.sid === studentId);
    return {
      date: dateStr,
      rank: rankIndex + 1,
      totalStudents
    };
  });

  // 5. Question Archive
  // Fetch all poll launches to find all questions that have ever been launched.
  // We want exactly one entry per Question, using the most recent PollLaunch.
  const allLaunches = await prisma.pollLaunch.findMany({
    orderBy: { launchedAt: 'desc' },
    include: { question: true }
  });

  const questionArchiveMap = new Map<string, any>();
  for (const launch of allLaunches) {
    if (!questionArchiveMap.has(launch.questionId)) {
      const q = launch.question;
      let optionsArr: string[] = [];
      if (Array.isArray(q.options)) {
        optionsArr = q.options as string[];
      }
      const correctAnswer = optionsArr[q.correctIndex] || '';

      questionArchiveMap.set(launch.questionId, {
        questionId: q.id,
        pollLaunchId: launch.id,
        text: q.text,
        points: q.points,
        correctAnswer,
        launchedAt: launch.launchedAt.toISOString()
      });
    }
  }

  const questionArchive = Array.from(questionArchiveMap.values());

  return {
    accuracy,
    avgTimeMs,
    currentStreak: streak.currentStreak,
    bestStreak: streak.bestStreak,
    totalPoints: netPoints,
    rankHistory,
    questionArchive
  };
}
