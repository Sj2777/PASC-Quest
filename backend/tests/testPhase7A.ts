/**
 * testPhase7A.ts
 *
 * Phase 7A test suite.
 *
 * Run with:  npx ts-node testPhase7A.ts
 *
 * Covers:
 *  A. Launch first question → LIVE
 *  B. Launch second question → Q1 still LIVE, Q2 LIVE
 *  C. Launching Q2 must NOT close Q1
 *  D. Manual close Q1 → CLOSED; Q2 still LIVE
 *  E. Manual close is isolated (Q2 unaffected)
 *  F. 24-hour expiry: launch older than 24h must not be considered available
 *  G. Just-before-expiry: launch at 23h59m59s is still available
 *  H. Scheduler cleanup: expired launch gets closed, valid launch untouched
 *  I. Multiple scheduled launches → both become LIVE in same run
 *  J. No cross-question contamination: Q1 lifecycle changes do not modify Q2
 *  K. Attempt uniqueness: student can have Attempt(Q1) + Attempt(Q2) but not Attempt(Q1)+Attempt(Q1)
 *  L. Streak regression: Q1 CORRECT + Q2 CORRECT → streak increments only once
 */

import prisma from '../src/lib/prisma';
import {
  executeQuestionLaunch,
  closePollLaunch,
  LAUNCH_LIFETIME_MS,
} from '../src/services/launchService';
import { updateStreakOnCorrectAttempt } from '../src/services/streakService';

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

/** Create a minimal DRAFT question for testing. */
async function createTestQuestion(adminId: string, suffix: string) {
  return prisma.question.create({
    data: {
      text: `[Phase7A-test] Q-${suffix}`,
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      timerSeconds: 30,
      createdById: adminId,
    },
  });
}

/** Create a student for testing if not already present. */
async function upsertTestStudent(nickname: string) {
  const existing = await prisma.student.findUnique({ where: { nickname } });
  if (existing) return existing;
  const bcrypt = await import('bcrypt');
  const hash = await bcrypt.hash('testpass', 1); // cheap hash for tests
  return prisma.student.create({
    data: { nickname, passwordHash: hash },
  });
}

/** Delete PollLaunches and Questions created by this test run by text prefix. */
async function cleanup(questionPrefix: string) {
  const questions = await prisma.question.findMany({
    where: { text: { startsWith: questionPrefix } },
    include: { launches: { include: { attempts: true } } },
  });
  for (const q of questions) {
    for (const l of q.launches) {
      await prisma.attempt.deleteMany({ where: { pollLaunchId: l.id } });
      await prisma.pollLaunch.delete({ where: { id: l.id } });
    }
    await prisma.question.delete({ where: { id: q.id } });
  }
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log(' Phase 7A Test Suite');
  console.log('══════════════════════════════════════════════\n');

  // ── Setup: find any admin to use as launcher ──────────────────────────────
  const admin = await prisma.admin.findFirst();
  if (!admin) {
    console.error('❌ No admin found in database. Seed an admin first.');
    process.exit(1);
  }

  const PREFIX = '[Phase7A-test] Q-';
  await cleanup(PREFIX); // clear stale runs

  // ─── A: Launch Q1 → LIVE ─────────────────────────────────────────────────
  console.log('A. Launch first question → LIVE');
  const q1 = await createTestQuestion(admin.id, 'A-Q1');
  const launch1 = await executeQuestionLaunch(q1.id, admin.id);

  const q1After = await prisma.question.findUnique({ where: { id: q1.id } });
  assert('Q1 status is LIVE', q1After?.status === 'LIVE');
  assert('PollLaunch A created', !!launch1.id);
  assert('PollLaunch A closedAt is null', launch1.closedAt === null);

  // ─── B & C: Launch Q2 → Q1 still LIVE, Q2 LIVE ───────────────────────────
  console.log('\nB+C. Launch second question → Q1 still LIVE, Q2 LIVE');
  const q2 = await createTestQuestion(admin.id, 'A-Q2');
  const launch2 = await executeQuestionLaunch(q2.id, admin.id);

  const [q1Post, q2Post] = await Promise.all([
    prisma.question.findUnique({ where: { id: q1.id } }),
    prisma.question.findUnique({ where: { id: q2.id } }),
  ]);
  const [l1Post, l2Post] = await Promise.all([
    prisma.pollLaunch.findUnique({ where: { id: launch1.id } }),
    prisma.pollLaunch.findUnique({ where: { id: launch2.id } }),
  ]);

  assert('Q1 is still LIVE after Q2 launched', q1Post?.status === 'LIVE');
  assert('Q2 is LIVE', q2Post?.status === 'LIVE');
  assert('PollLaunch A (Q1) is still open', l1Post?.closedAt === null);
  assert('PollLaunch B (Q2) is open', l2Post?.closedAt === null);

  // ─── D: Manual close Q1 ──────────────────────────────────────────────────
  console.log('\nD. Manual close Q1 → CLOSED; Q2 still LIVE');
  await closePollLaunch(launch1.id);

  const [l1Closed, q1Closed, l2StillOpen, q2Still] = await Promise.all([
    prisma.pollLaunch.findUnique({ where: { id: launch1.id } }),
    prisma.question.findUnique({ where: { id: q1.id } }),
    prisma.pollLaunch.findUnique({ where: { id: launch2.id } }),
    prisma.question.findUnique({ where: { id: q2.id } }),
  ]);

  assert('PollLaunch A closedAt is set', l1Closed?.closedAt !== null);
  assert('Q1 status is CLOSED', q1Closed?.status === 'CLOSED');

  // ─── E: Manual close is isolated ─────────────────────────────────────────
  console.log('\nE. Closing Q1 did not affect Q2');
  assert('PollLaunch B is still open', l2StillOpen?.closedAt === null, `closedAt=${l2StillOpen?.closedAt}`);
  assert('Q2 is still LIVE', q2Still?.status === 'LIVE');

  // ─── F: 24-hour expiry — API level ───────────────────────────────────────
  console.log('\nF. 24-hour expiry check (API-level)');
  const qF = await createTestQuestion(admin.id, 'F-expired');
  const launchF = await executeQuestionLaunch(qF.id, admin.id);

  // Back-date the launchedAt to 25 hours ago
  const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
  await prisma.pollLaunch.update({
    where: { id: launchF.id },
    data: { launchedAt: twentyFiveHoursAgo },
  });

  const lF = await prisma.pollLaunch.findUnique({ where: { id: launchF.id } });
  const isExpired = lF ? Date.now() >= lF.launchedAt.getTime() + LAUNCH_LIFETIME_MS : true;
  assert('Backdated launch is detected as expired', isExpired);

  // API check: GET /current should NOT return this expired launch
  // (We simulate what the route does: windowStart = now - 24h; launch.launchedAt must be > windowStart)
  const windowStart = new Date(Date.now() - LAUNCH_LIFETIME_MS);
  const wouldBeReturned = lF ? lF.launchedAt > windowStart && lF.closedAt === null : false;
  assert('API would NOT return an expired launch', !wouldBeReturned);

  // ─── G: Just-before-expiry ───────────────────────────────────────────────
  console.log('\nG. Just-before-expiry: 23h59m59s is still available');
  const qG = await createTestQuestion(admin.id, 'G-justalive');
  const launchG = await executeQuestionLaunch(qG.id, admin.id);

  const justBefore = new Date(Date.now() - (LAUNCH_LIFETIME_MS - 1000)); // 1s before expiry
  await prisma.pollLaunch.update({
    where: { id: launchG.id },
    data: { launchedAt: justBefore },
  });

  const lG = await prisma.pollLaunch.findUnique({ where: { id: launchG.id } });
  const gWindowStart = new Date(Date.now() - LAUNCH_LIFETIME_MS);
  const gWouldBeReturned = lG ? lG.launchedAt > gWindowStart && lG.closedAt === null : false;
  assert('Launch 1s before expiry IS returned by API', gWouldBeReturned);

  // ─── H: Scheduler cleanup ────────────────────────────────────────────────
  console.log('\nH. Scheduler cleanup: expired gets closed, valid stays open');

  // qF is the expired one (backdated 25h), qG is still valid (23h59m59s)
  // Simulate what the scheduler does:
  const now = new Date();
  const expiryThreshold = new Date(now.getTime() - LAUNCH_LIFETIME_MS);

  const expiredLaunches = await prisma.pollLaunch.findMany({
    where: { closedAt: null, launchedAt: { lte: expiryThreshold } },
    select: { id: true },
  });

  const expiredIds = expiredLaunches.map(l => l.id);
  assert('Scheduler finds expired launch F', expiredIds.includes(launchF.id));
  assert('Scheduler does NOT include valid launch G', !expiredIds.includes(launchG.id));

  // Actually close them (as scheduler would)
  for (const l of expiredLaunches) {
    await closePollLaunch(l.id);
  }

  const [lFAfterCleanup, lGAfterCleanup] = await Promise.all([
    prisma.pollLaunch.findUnique({ where: { id: launchF.id } }),
    prisma.pollLaunch.findUnique({ where: { id: launchG.id } }),
  ]);
  assert('Scheduler closed expired launch F', lFAfterCleanup?.closedAt !== null);
  assert('Scheduler left valid launch G open', lGAfterCleanup?.closedAt === null);

  // ─── I: Multiple scheduled launches ──────────────────────────────────────
  console.log('\nI. Multiple scheduled launches → both become LIVE in same run');
  const schedTime = new Date(Date.now() - 60_000); // 1 minute ago — already due
  const qI1 = await prisma.question.create({
    data: {
      text: `${PREFIX}I-sched1`,
      options: ['A', 'B'],
      correctIndex: 0,
      timerSeconds: 10,
      createdById: admin.id,
      status: 'SCHEDULED',
      scheduledAt: schedTime,
    },
  });
  const qI2 = await prisma.question.create({
    data: {
      text: `${PREFIX}I-sched2`,
      options: ['A', 'B'],
      correctIndex: 0,
      timerSeconds: 10,
      createdById: admin.id,
      status: 'SCHEDULED',
      scheduledAt: schedTime,
    },
  });

  // Simulate exactly what the scheduler does
  const scheduledDue = await prisma.question.findMany({
    where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
  });
  const dueIds = scheduledDue.map(q => q.id);
  assert('Both scheduled questions are found by scheduler', dueIds.includes(qI1.id) && dueIds.includes(qI2.id));

  for (const q of scheduledDue.filter(q => dueIds.includes(q.id))) {
    await executeQuestionLaunch(q.id, admin.id);
  }

  const [qI1After, qI2After] = await Promise.all([
    prisma.question.findUnique({ where: { id: qI1.id } }),
    prisma.question.findUnique({ where: { id: qI2.id } }),
  ]);
  assert('Scheduled Q1 (I-sched1) is LIVE', qI1After?.status === 'LIVE');
  assert('Scheduled Q2 (I-sched2) is LIVE', qI2After?.status === 'LIVE');

  // ─── J: No cross-question contamination ──────────────────────────────────
  console.log('\nJ. Cross-question contamination check');
  // We already verified this in test C (Q2 launch didn't close Q1) and D (closing Q1 didn't close Q2).
  // Add an explicit re-verification:
  const launchI1 = await prisma.pollLaunch.findFirst({ where: { questionId: qI1.id } });
  const launchI2 = await prisma.pollLaunch.findFirst({ where: { questionId: qI2.id } });

  if (launchI1 && launchI2) {
    await closePollLaunch(launchI1.id);
    const i2AfterCloseI1 = await prisma.pollLaunch.findUnique({ where: { id: launchI2.id } });
    assert('Closing I-sched1 does not close I-sched2', i2AfterCloseI1?.closedAt === null);
  }

  // ─── K: Attempt uniqueness ───────────────────────────────────────────────
  console.log('\nK. Attempt uniqueness: Attempt(Q1)+Attempt(Q2) ok; Attempt(Q1)+Attempt(Q1) fails');
  const student = await upsertTestStudent('phase7a_tester');

  // Need a fresh open launch for this check — use Q2 launch (l2) which is still open
  // Q2 is LIVE via launch2. Q1's launch1 is closed. Create a new separate q for this test.
  const qK1 = await createTestQuestion(admin.id, 'K-Q1');
  const qK2 = await createTestQuestion(admin.id, 'K-Q2');
  const lK1 = await executeQuestionLaunch(qK1.id, admin.id);
  const lK2 = await executeQuestionLaunch(qK2.id, admin.id);

  // Attempt on lK1
  await prisma.attempt.create({
    data: { pollLaunchId: lK1.id, studentId: student.id, result: 'CORRECT', timeTakenMs: 1000 },
  });
  // Attempt on lK2 — must succeed
  let attemptK2ok = false;
  try {
    await prisma.attempt.create({
      data: { pollLaunchId: lK2.id, studentId: student.id, result: 'WRONG', timeTakenMs: 2000 },
    });
    attemptK2ok = true;
  } catch {
    attemptK2ok = false;
  }
  assert('Student can attempt Q1 and Q2 independently', attemptK2ok);

  // Duplicate attempt on lK1 — must fail with P2002
  let duplicateFailed = false;
  try {
    await prisma.attempt.create({
      data: { pollLaunchId: lK1.id, studentId: student.id, result: 'WRONG', timeTakenMs: 999 },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') duplicateFailed = true;
  }
  assert('Duplicate Attempt(Q1) throws P2002 unique constraint', duplicateFailed);

  // ─── L: Streak regression ────────────────────────────────────────────────
  console.log('\nL. Streak regression: Q1 CORRECT + Q2 CORRECT → streak increments only once');
  const streakStudent = await upsertTestStudent('phase7a_streak_tester');

  // Reset the student's streak state for a clean test
  await prisma.student.update({
    where: { id: streakStudent.id },
    data: { currentStreak: 0, bestStreak: 0, lastCorrectDate: null, comebackActive: false, comebackProgress: 0, preBreakStreak: 0 },
  });

  // First correct attempt (Q1)
  await updateStreakOnCorrectAttempt(streakStudent.id);
  const afterQ1 = await prisma.student.findUnique({ where: { id: streakStudent.id } });

  // Second correct attempt (Q2) — same calendar day
  await updateStreakOnCorrectAttempt(streakStudent.id);
  const afterQ2 = await prisma.student.findUnique({ where: { id: streakStudent.id } });

  assert('After Q1 CORRECT: streak is 1', afterQ1?.currentStreak === 1);
  assert('After Q2 CORRECT same day: streak remains 1 (idempotent)', afterQ2?.currentStreak === 1);


  // ═══════════════════════════════════════════════════════════════════════════
  // CORRECTION PASS TESTS — API-level availability checks (A–F)
  // These simulate the EXACT logic applied by the route handlers rather than
  // calling HTTP endpoints (no HTTP test client is wired up), which is the
  // same approach used by Tests F and G above.
  // ═══════════════════════════════════════════════════════════════════════════

  // Helper: simulate the full set of availability conditions from GET /current
  // and POST /start for a given PollLaunch record.
  // A 1-second tolerance is applied to the hasStarted check to handle the tiny
  // clock difference between Node's Date.now() and Postgres's @default(now()).
  function isAvailable(l: { launchedAt: Date; closedAt: Date | null; question: { status: string } }): boolean {
    const nowMs = Date.now();
    const hasStarted   = l.launchedAt.getTime() <= nowMs + 1000; // +1s tolerance
    const withinWindow = nowMs < l.launchedAt.getTime() + LAUNCH_LIFETIME_MS;
    return l.closedAt === null && hasStarted && withinWindow && l.question.status === 'LIVE';
  }

  // Helper: simulate GET /current WHERE clause on a PollLaunch+Question row.
  // Same 1-second tolerance applied to the lte: now guard.
  function wouldCurrentReturn(l: { launchedAt: Date; closedAt: Date | null; question: { status: string } }): boolean {
    const nowMs = Date.now();
    const windowStartMs = nowMs - LAUNCH_LIFETIME_MS;
    return (
      l.closedAt === null &&
      l.launchedAt.getTime() > windowStartMs &&      // gt: windowStart
      l.launchedAt.getTime() <= nowMs + 1000 &&      // lte: now (+1s tolerance)
      l.question.status === 'LIVE'
    );
  }


  // ─── Correction Test A: EXPIRED /start ──────────────────────────────────
  console.log('\nCorrection A. EXPIRED /start — launch >24h old must be rejected');
  const qCA = await createTestQuestion(admin.id, 'CA-expired');
  const lCA = await executeQuestionLaunch(qCA.id, admin.id);

  // Back-date to 24h + 1 second ago
  const caLaunchedAt = new Date(Date.now() - LAUNCH_LIFETIME_MS - 1000);
  await prisma.pollLaunch.update({ where: { id: lCA.id }, data: { launchedAt: caLaunchedAt } });

  const lCAFull = await prisma.pollLaunch.findUnique({ where: { id: lCA.id }, include: { question: true } });
  assert('Correction A: expired launch fails availability', !isAvailable(lCAFull!));
  assert('Correction A: expired launch not returned by /current', !wouldCurrentReturn(lCAFull!));

  // ─── Correction Test B: MANUALLY CLOSED /start ──────────────────────────
  console.log('\nCorrection B. MANUALLY CLOSED /start — closed launch must be rejected');
  const qCB = await createTestQuestion(admin.id, 'CB-manuallyclosed');
  const lCB = await executeQuestionLaunch(qCB.id, admin.id);
  await closePollLaunch(lCB.id);

  const lCBFull = await prisma.pollLaunch.findUnique({ where: { id: lCB.id }, include: { question: true } });
  assert('Correction B: manually closed launch fails availability', !isAvailable(lCBFull!));
  assert('Correction B: manually closed launch not returned by /current', !wouldCurrentReturn(lCBFull!));

  // ─── Correction Test C: FUTURE LAUNCH ────────────────────────────────────
  console.log('\nCorrection C. FUTURE LAUNCH — future launchedAt is structurally impossible');
  // `executeQuestionLaunch` creates a PollLaunch with `launchedAt: @default(now())`.
  // There is no API parameter to supply a future launchedAt at launch time.
  // The only way to produce a future launchedAt would be direct DB manipulation.
  // We document this as structurally impossible through production code paths
  // and verify the guard holds via the simulated check.
  const futureLaunchedAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour in the future
  const fakeFutureLaunch = {
    launchedAt: futureLaunchedAt,
    closedAt: null,
    question: { status: 'LIVE' as string },
  };
  assert('Correction C: future launchedAt fails availability (hasStarted=false)', !isAvailable(fakeFutureLaunch));
  assert('Correction C: future launchedAt not returned by /current (lte: now guard)', !wouldCurrentReturn(fakeFutureLaunch));
  console.log('  ℹ️  NOTE: future launchedAt cannot exist through production APIs; guard is defence-in-depth.');

  // ─── Correction Test D: TWO LIVE QUESTIONS ───────────────────────────────
  console.log('\nCorrection D. TWO LIVE QUESTIONS — both available, neither closes the other');
  const qCD1 = await createTestQuestion(admin.id, 'CD-q1');
  const qCD2 = await createTestQuestion(admin.id, 'CD-q2');
  const lCD1 = await executeQuestionLaunch(qCD1.id, admin.id);
  const lCD2 = await executeQuestionLaunch(qCD2.id, admin.id);

  const [lCD1Full, lCD2Full] = await Promise.all([
    prisma.pollLaunch.findUnique({ where: { id: lCD1.id }, include: { question: true } }),
    prisma.pollLaunch.findUnique({ where: { id: lCD2.id }, include: { question: true } }),
  ]);

  // NOTE: capture nowMs AFTER fetching from DB to avoid JS/Postgres clock skew.
  // DB @default(now()) sets launchedAt at insert time; we fetch it back a few ms later.
  // Evaluating Date.now() at fetch time guarantees launchedAt <= nowMs.
  assert('Correction D: Q1 launch passes availability', isAvailable(lCD1Full!));
  assert('Correction D: Q2 launch passes availability', isAvailable(lCD2Full!));
  assert('Correction D: Q1 not closed by Q2 launch (closedAt null)', lCD1Full!.closedAt === null);
  assert('Correction D: Q2 not closed by Q1 launch (closedAt null)', lCD2Full!.closedAt === null);
  assert('Correction D: Q1 would be returned by /current', wouldCurrentReturn(lCD1Full!));
  assert('Correction D: Q2 would be returned by /current', wouldCurrentReturn(lCD2Full!));


  // ─── Correction Test E: EXACT 24-HOUR BOUNDARY ───────────────────────────
  console.log('\nCorrection E. EXACT 24-HOUR BOUNDARY');

  // At exactly 24h: launchedAt = now - LAUNCH_LIFETIME_MS → unavailable
  const qCE1 = await createTestQuestion(admin.id, 'CE-exact24h');
  const lCE1 = await executeQuestionLaunch(qCE1.id, admin.id);
  const exactExpiry = new Date(Date.now() - LAUNCH_LIFETIME_MS);
  await prisma.pollLaunch.update({ where: { id: lCE1.id }, data: { launchedAt: exactExpiry } });
  const lCE1Full = await prisma.pollLaunch.findUnique({ where: { id: lCE1.id }, include: { question: true } });

  // At 24h - 1 second: launchedAt = now - LAUNCH_LIFETIME_MS + 1000 → still available
  const qCE2 = await createTestQuestion(admin.id, 'CE-just-before-24h');
  const lCE2 = await executeQuestionLaunch(qCE2.id, admin.id);
  const justBeforeExpiry = new Date(Date.now() - LAUNCH_LIFETIME_MS + 1000);
  await prisma.pollLaunch.update({ where: { id: lCE2.id }, data: { launchedAt: justBeforeExpiry } });
  const lCE2Full = await prisma.pollLaunch.findUnique({ where: { id: lCE2.id }, include: { question: true } });

  assert('Correction E: launch at exactly 24h old is UNAVAILABLE', !isAvailable(lCE1Full!));
  assert('Correction E: launch at exactly 24h old not returned by /current', !wouldCurrentReturn(lCE1Full!));
  assert('Correction E: launch 1s before 24h IS available', isAvailable(lCE2Full!));
  assert('Correction E: launch 1s before 24h returned by /current', wouldCurrentReturn(lCE2Full!));

  // ─── Correction Test F: SCHEDULED QUESTION ───────────────────────────────
  console.log('\nCorrection F. SCHEDULED QUESTION — no PollLaunch, must not appear in /current');
  const qCF = await prisma.question.create({
    data: {
      text: `${PREFIX}CF-scheduled`,
      options: ['A', 'B'],
      correctIndex: 0,
      timerSeconds: 10,
      createdById: admin.id,
      status: 'SCHEDULED',
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // future scheduled time
    },
  });

  // SCHEDULED question has zero PollLaunch records — confirmed by count
  const cfLaunchCount = await prisma.pollLaunch.count({ where: { questionId: qCF.id } });
  assert('Correction F: SCHEDULED question has 0 PollLaunch records', cfLaunchCount === 0);

  // Simulate the /current query: no PollLaunch exists for this question,
  // so it structurally cannot be returned.
  const now2 = new Date();
  const windowStart2 = new Date(now2.getTime() - LAUNCH_LIFETIME_MS);
  const cfLaunches = await prisma.pollLaunch.findMany({
    where: {
      closedAt: null,
      launchedAt: { gt: windowStart2, lte: now2 },
      question: { status: 'LIVE', id: qCF.id },
    },
  });
  assert('Correction F: SCHEDULED question has 0 launches matching /current WHERE', cfLaunches.length === 0);
  console.log('  ℹ️  NOTE: SCHEDULED questions cannot appear in /current because executeQuestionLaunch');
  console.log('           (which creates the PollLaunch) has not been called yet. The question.status=LIVE');
  console.log('           filter in /current provides additional defence-in-depth for broken DB states.');

  // Clean up CF scheduled question (no launches to delete)
  await prisma.question.delete({ where: { id: qCF.id } });

  // ─── Summary ──────────────────────────────────────────────────────────────
  await cleanup(PREFIX);

  // Clean up test students (reset their state, don't delete to preserve real accounts)
  await prisma.student.updateMany({
    where: { nickname: { in: ['phase7a_tester', 'phase7a_streak_tester'] } },
    data: { currentStreak: 0, bestStreak: 0, lastCorrectDate: null },
  });

  console.log('\n══════════════════════════════════════════════');
  console.log(` Results: ${passCount} passed, ${failCount} failed`);
  console.log('══════════════════════════════════════════════\n');

  if (failCount > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

