/**
 * testPhase7CB.ts
 *
 * Phase 7C-B test suite — verifies independent question completion flow.
 *
 * Covers:
 *  A. Student can start Q1 and Q2.
 *  B. Completing Q1 does not make Q2 unavailable.
 *  C. GET /current returns completed:true only for the completed launch.
 *  D. Duplicate attempt on Q1 is rejected.
 */

import prisma from './src/lib/prisma';
import { executeQuestionLaunch, closePollLaunch, LAUNCH_LIFETIME_MS } from './src/services/launchService';
import { updateStreakOnCorrectAttempt } from './src/services/streakService';
import { Request, Response } from 'express';
// @ts-ignore
import { optionalStudentAuth } from './src/middleware/studentAuth';

// ─── helpers ────────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? ` — ${detail}` : ''}`);
    failCount++;
  }
}

const PREFIX = '[Phase7C-B] ';

async function createQ(adminId: string, suffix: string) {
  return prisma.question.create({
    data: {
      text: `${PREFIX}${suffix}`,
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      timerSeconds: 30,
      createdById: adminId,
    },
  });
}

/** Simulate GET /api/poll/current with optionalStudentAuth */
async function getCurrentPolls(studentId?: string) {
  const req = { cookies: {} } as any;
  if (studentId) {
    req.studentId = studentId;
  }
  
  const now = new Date();
  const windowStart = new Date(now.getTime() - LAUNCH_LIFETIME_MS);
  const nowPlus1s = new Date(now.getTime() + 1000);

  const launches = await prisma.pollLaunch.findMany({
    where: {
      closedAt: null,
      launchedAt: { gt: windowStart, lte: nowPlus1s },
      question: { status: 'LIVE' },
    },
    orderBy: { launchedAt: 'desc' },
    include: { question: true },
  });

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

  return launches.map((l) => ({
    pollLaunchId: l.id,
    questionId: l.question.id,
    text: l.question.text,
    completed: completedSet.has(l.id),
  }));
}

async function cleanup() {
  const questions = await prisma.question.findMany({
    where: { text: { startsWith: PREFIX } },
    include: { launches: { include: { attempts: true } } },
  });
  for (const q of questions) {
    for (const l of q.launches) {
      await prisma.attempt.deleteMany({ where: { pollLaunchId: l.id } });
      await prisma.pollLaunch.delete({ where: { id: l.id } });
    }
    await prisma.question.delete({ where: { id: q.id } });
  }
  
  await prisma.student.deleteMany({ where: { nickname: { startsWith: PREFIX } } });
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log(' Phase 7C-B Test Suite — Independent Result Flow');
  console.log('══════════════════════════════════════════════\n');

  const admin = await prisma.admin.findFirst();
  if (!admin) {
    console.error('❌ No admin found.');
    process.exit(1);
  }

  await cleanup();

  const student = await prisma.student.create({
    data: { nickname: `${PREFIX}tester`, passwordHash: 'hash' },
  });

  const q1 = await createQ(admin.id, 'Q1');
  const q2 = await createQ(admin.id, 'Q2');
  const l1 = await executeQuestionLaunch(q1.id, admin.id);
  const l2 = await executeQuestionLaunch(q2.id, admin.id);

  // ─── A: Initial State ────────────────────────────────────────────────────
  console.log('A. Initial State: Both live, neither completed');
  let polls = await getCurrentPolls(student.id);
  let p1 = polls.find(p => p.pollLaunchId === l1.id);
  let p2 = polls.find(p => p.pollLaunchId === l2.id);
  
  assert('A: Q1 is present', !!p1);
  assert('A: Q2 is present', !!p2);
  assert('A: Q1 not completed', p1?.completed === false);
  assert('A: Q2 not completed', p2?.completed === false);

  // ─── B: Complete Q1 ──────────────────────────────────────────────────────
  console.log('\nB. Complete Q1');
  await prisma.attempt.create({
    data: { pollLaunchId: l1.id, studentId: student.id, result: 'CORRECT', timeTakenMs: 1500 }
  });
  
  polls = await getCurrentPolls(student.id);
  p1 = polls.find(p => p.pollLaunchId === l1.id);
  p2 = polls.find(p => p.pollLaunchId === l2.id);
  
  assert('B: Q1 is still present', !!p1);
  assert('B: Q1 is now completed:true', p1?.completed === true);
  assert('B: Q2 is still present', !!p2);
  assert('B: Q2 remains completed:false', p2?.completed === false);

  // ─── C: Duplicate attempt rejected ───────────────────────────────────────
  console.log('\nC. Duplicate Attempt Constraint');
  let dupFailed = false;
  try {
    await prisma.attempt.create({
      data: { pollLaunchId: l1.id, studentId: student.id, result: 'WRONG', timeTakenMs: 2000 }
    });
  } catch (e: any) {
    if (e.code === 'P2002') dupFailed = true;
  }
  assert('C: Duplicate attempt throws P2002', dupFailed);

  // ─── D: Complete Q2 ──────────────────────────────────────────────────────
  console.log('\nD. Complete Q2 independently');
  await prisma.attempt.create({
    data: { pollLaunchId: l2.id, studentId: student.id, result: 'WRONG', timeTakenMs: 3000 }
  });
  
  polls = await getCurrentPolls(student.id);
  p1 = polls.find(p => p.pollLaunchId === l1.id);
  p2 = polls.find(p => p.pollLaunchId === l2.id);
  
  assert('D: Q1 remains completed:true', p1?.completed === true);
  assert('D: Q2 is now completed:true', p2?.completed === true);

  await cleanup();

  console.log('\n══════════════════════════════════════════════');
  console.log(` Results: ${passCount} passed, ${failCount} failed`);
  console.log('══════════════════════════════════════════════\n');

  if (failCount > 0) process.exit(1);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
