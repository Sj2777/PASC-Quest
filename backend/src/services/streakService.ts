import prisma from '../lib/prisma';

import { getIstMidnight } from '../lib/dateUtils';

export async function updateStreakOnCorrectAttempt(studentId: string): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId }
  });

  if (!student) return;

  const now = new Date();
  const today = getIstMidnight(now)!;
  const lastCorrect = getIstMidnight(student.lastCorrectDate);

  let daysSinceLastCorrect: number | null = null;
  if (lastCorrect) {
    const msPerDay = 1000 * 60 * 60 * 24;
    daysSinceLastCorrect = Math.round((today.getTime() - lastCorrect.getTime()) / msPerDay);
  }

  let { currentStreak, bestStreak, comebackActive, comebackProgress, preBreakStreak } = student;

  if (daysSinceLastCorrect === 0) {
    // Already logged a correct answer today — no changes, return early (idempotent).
    return;
  }

  if (daysSinceLastCorrect === 1) {
    // Consecutive day.
    if (comebackActive) {
      comebackProgress += 1;
      if (comebackProgress >= 3) {
        currentStreak = preBreakStreak + comebackProgress;
        comebackActive = false;
        comebackProgress = 0;
        preBreakStreak = 0;
      }
    } else {
      currentStreak += 1;
    }
  } else if (daysSinceLastCorrect === null) {
    // First ever correct attempt
    currentStreak = 1;
  } else if (daysSinceLastCorrect > 1) {
    // A day was missed.
    if (comebackActive) {
      // Missed again mid-comeback: the comeback fails.
      currentStreak = 1;
      comebackActive = false;
      comebackProgress = 0;
      preBreakStreak = 0;
    } else {
      // First miss: this is a fresh break.
      preBreakStreak = currentStreak;
      currentStreak = 0;
      comebackActive = true;
      comebackProgress = 1;
    }
  }

  bestStreak = Math.max(bestStreak, currentStreak);

  await prisma.student.update({
    where: { id: studentId },
    data: {
      currentStreak,
      bestStreak,
      lastCorrectDate: today,
      comebackActive,
      comebackProgress,
      preBreakStreak
    }
  });
}

export async function getStreakStatus(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      currentStreak: true,
      bestStreak: true,
      comebackActive: true,
      comebackProgress: true,
      preBreakStreak: true,
      lastCorrectDate: true,
    }
  });

  if (!student) {
    throw new Error('Student not found');
  }

  let { currentStreak, bestStreak, comebackActive, comebackProgress, preBreakStreak, lastCorrectDate } = student;

  const now = new Date();
  const today = getIstMidnight(now)!;
  const lastCorrect = getIstMidnight(lastCorrectDate);

  if (lastCorrect) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysSinceLastCorrect = Math.round((today.getTime() - lastCorrect.getTime()) / msPerDay);

    if (daysSinceLastCorrect > 1) {
      if (!comebackActive && currentStreak > 0) {
        preBreakStreak = currentStreak;
        currentStreak = 0;
        comebackActive = true;
        comebackProgress = 0;
        await prisma.student.update({
          where: { id: studentId },
          data: {
            preBreakStreak,
            currentStreak,
            comebackActive,
            comebackProgress
          }
        });
      }
    }
  }

  return {
    currentStreak,
    bestStreak,
    comebackActive,
    comebackProgress,
    preBreakStreak,
    daysRemainingToRecover: comebackActive ? 3 - comebackProgress : null
  };
}
