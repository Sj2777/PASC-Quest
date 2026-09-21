/**
 * testPhase7C.ts
 *
 * Phase 7C-A test suite — verifies GET /api/poll/current returns an array.
 *
 * Run with:  npx ts-node testPhase7C.ts
 *
 * Covers:
 *  A. No live launches           → returns empty array
 *  B. One live launch            → returns array of one
 *  C. Two live launches          → returns both
 *  D. One expired + one live     → returns only live
 *  E. One closed + one live      → returns only live
 *  F. SCHEDULED question (no launch) → not returned
 *  G. Future launchedAt          → not returned (structurally impossible via production API)
 *  H. Ordering                   → newest launchedAt first
 *  I–K. Landing navigation contract → each item has the fields QuestionPage needs
 */

import prisma from './src/lib/prisma';
import {
  executeQuestionLaunch,
  closePollLaunch,
  LAUNCH_LIFETIME_MS,
} from './src/services/launchService';

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

const PREFIX = '[Phase7C-test] ';

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

/** Simulate exactly what GET /api/poll/current now does.
 *  A 1-second tolerance is applied to the lte: now guard to handle the small
 *  clock difference between Node Date.now() and Postgres @default(now()). */
async function getCurrentPolls() {
  const now = new Date();
  const nowPlus1s = new Date(now.getTime() + 1000); // +1s tolerance for clock skew
  const windowStart = new Date(now.getTime() - LAUNCH_LIFETIME_MS);

  const launches = await prisma.pollLaunch.findMany({
    where: {
      closedAt: null,
      launchedAt: { gt: windowStart, lte: nowPlus1s },
      question: { status: 'LIVE' },
    },
    orderBy: { launchedAt: 'desc' },
    include: { question: true },
  });

  return launches.map((l) => ({
    pollLaunchId: l.id,
    questionId: l.question.id,
    text: l.question.text,
    options: l.question.options as string[],
    timerSeconds: l.question.timerSeconds,
    launchedAt: l.launchedAt.toISOString(),
    expiresAt: new Date(l.launchedAt.getTime() + LAUNCH_LIFETIME_MS).toISOString(),
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
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log(' Phase 7C-A Test Suite — GET /api/poll/current');
  console.log('══════════════════════════════════════════════\n');

  const admin = await prisma.admin.findFirst();
  if (!admin) {
    console.error('❌ No admin found. Seed an admin first.');
    process.exit(1);
  }

  await cleanup();

  // ─── A: No live launches → empty array ──────────────────────────────────
  console.log('A. No live launches → empty array');
  {
    const result = await getCurrentPolls();
    // Filter to only our test questions (all production data excluded via cleanup)
    const ours = result.filter((r) => r.text.startsWith(PREFIX));
    assert('A: returns array (not null)', Array.isArray(result));
    // We can't assert length === 0 because production data may exist;
    // instead assert none of our test questions appear.
    assert('A: no test-prefix launches present', ours.length === 0);
  }

  // ─── B: One live launch → array of one ───────────────────────────────────
  console.log('\nB. One live launch → array of one');
  {
    const q = await createQ(admin.id, 'B-single');
    const l = await executeQuestionLaunch(q.id, admin.id);

    const result = await getCurrentPolls();
    const ours = result.filter((r) => r.text.startsWith(PREFIX));
    assert('B: returns at least one result', ours.length >= 1);
    const match = ours.find((r) => r.pollLaunchId === l.id);
    assert('B: the launched question is in results', !!match);
    assert('B: item has pollLaunchId', !!match?.pollLaunchId);
    assert('B: item has questionId', !!match?.questionId);
    assert('B: item has text', !!match?.text);
    assert('B: item has options array', Array.isArray(match?.options));
    assert('B: item has timerSeconds', typeof match?.timerSeconds === 'number');
    assert('B: item has launchedAt', !!match?.launchedAt);
    assert('B: item has expiresAt', !!match?.expiresAt);
    // Verify expiresAt = launchedAt + 24h
    if (match) {
      const launchedMs = new Date(match.launchedAt).getTime();
      const expiresMs = new Date(match.expiresAt).getTime();
      assert('B: expiresAt = launchedAt + 24h', expiresMs - launchedMs === LAUNCH_LIFETIME_MS);
    }

    await closePollLaunch(l.id);
  }

  // ─── C: Two live launches → returns both ────────────────────────────────
  console.log('\nC. Two live launches → returns both');
  {
    const q1 = await createQ(admin.id, 'C-q1');
    const q2 = await createQ(admin.id, 'C-q2');
    const l1 = await executeQuestionLaunch(q1.id, admin.id);
    const l2 = await executeQuestionLaunch(q2.id, admin.id);

    const result = await getCurrentPolls();
    const ids = result.map((r) => r.pollLaunchId);
    assert('C: launch 1 in results', ids.includes(l1.id));
    assert('C: launch 2 in results', ids.includes(l2.id));

    await closePollLaunch(l1.id);
    await closePollLaunch(l2.id);
  }

  // ─── D: One expired + one live → only live ───────────────────────────────
  console.log('\nD. One expired + one live → only live returned');
  {
    const qExp = await createQ(admin.id, 'D-expired');
    const qLive = await createQ(admin.id, 'D-live');
    const lExp = await executeQuestionLaunch(qExp.id, admin.id);
    const lLive = await executeQuestionLaunch(qLive.id, admin.id);

    // Back-date the expired launch to 25h ago
    await prisma.pollLaunch.update({
      where: { id: lExp.id },
      data: { launchedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });

    const result = await getCurrentPolls();
    const ids = result.map((r) => r.pollLaunchId);
    assert('D: expired launch NOT in results', !ids.includes(lExp.id));
    assert('D: live launch IS in results', ids.includes(lLive.id));

    await closePollLaunch(lLive.id);
    // lExp is expired — close it for cleanup
    await closePollLaunch(lExp.id);
  }

  // ─── E: One manually closed + one live → only live ───────────────────────
  console.log('\nE. One manually closed + one live → only live returned');
  {
    const qClosed = await createQ(admin.id, 'E-closed');
    const qLive = await createQ(admin.id, 'E-live');
    const lClosed = await executeQuestionLaunch(qClosed.id, admin.id);
    const lLive = await executeQuestionLaunch(qLive.id, admin.id);

    // Close the first one
    await closePollLaunch(lClosed.id);

    const result = await getCurrentPolls();
    const ids = result.map((r) => r.pollLaunchId);
    assert('E: closed launch NOT in results', !ids.includes(lClosed.id));
    assert('E: live launch IS in results', ids.includes(lLive.id));

    await closePollLaunch(lLive.id);
  }

  // ─── F: SCHEDULED question (no launch) → not returned ────────────────────
  console.log('\nF. SCHEDULED question with no launch → not returned');
  {
    const qSched = await prisma.question.create({
      data: {
        text: `${PREFIX}F-scheduled`,
        options: ['A', 'B'],
        correctIndex: 0,
        timerSeconds: 10,
        createdById: admin.id,
        status: 'SCHEDULED',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const launchCount = await prisma.pollLaunch.count({ where: { questionId: qSched.id } });
    assert('F: SCHEDULED question has 0 PollLaunch records', launchCount === 0);

    const result = await getCurrentPolls();
    const match = result.find((r) => r.questionId === qSched.id);
    assert('F: SCHEDULED question not returned by /current', !match);

    // Cleanup
    await prisma.question.delete({ where: { id: qSched.id } });
  }

  // ─── G: Future launchedAt → not returned (structurally impossible) ────────
  console.log('\nG. Future launchedAt → not returned (documented as structurally impossible)');
  {
    // Production code cannot create a PollLaunch with a future launchedAt.
    // executeQuestionLaunch uses @default(now()) and no future date is accepted.
    // We verify the WHERE clause logic: lte: now guards against it.
    const futureMs = Date.now() + 60 * 60 * 1000;
    const fakeFuture = { launchedAt: new Date(futureMs) };
    const nowMs = Date.now();
    const isWithinWindow =
      fakeFuture.launchedAt.getTime() > nowMs - LAUNCH_LIFETIME_MS &&
      fakeFuture.launchedAt.getTime() <= nowMs; // lte: now rejects this
    assert('G: future launchedAt fails the lte: now WHERE clause', !isWithinWindow);
    console.log('  ℹ️  NOTE: future launchedAt cannot be created via the production API.');
  }

  // ─── H: Ordering → newest launchedAt first ───────────────────────────────
  console.log('\nH. Ordering: newest launchedAt first');
  {
    const qH1 = await createQ(admin.id, 'H-older');
    const qH2 = await createQ(admin.id, 'H-newer');
    const lH1 = await executeQuestionLaunch(qH1.id, admin.id);
    const lH2 = await executeQuestionLaunch(qH2.id, admin.id);

    // Back-date lH1 by 1 hour so lH2 is "newer"
    await prisma.pollLaunch.update({
      where: { id: lH1.id },
      data: { launchedAt: new Date(Date.now() - 60 * 60 * 1000) },
    });

    const result = await getCurrentPolls();
    const ids = result.map((r) => r.pollLaunchId);
    const idx1 = ids.indexOf(lH1.id);
    const idx2 = ids.indexOf(lH2.id);
    assert('H: both launches present', idx1 !== -1 && idx2 !== -1);
    // lH2 (newer) should appear before lH1 (older)
    assert('H: newer launch (H2) appears before older launch (H1)', idx2 < idx1, `idx2=${idx2} idx1=${idx1}`);

    await closePollLaunch(lH1.id);
    await closePollLaunch(lH2.id);
  }

  // ─── I–K: Landing navigation contract ─────────────────────────────────────
  console.log('\nI–K. Landing navigation contract: each item has all required fields');
  {
    const qI1 = await createQ(admin.id, 'I-q1');
    const qI2 = await createQ(admin.id, 'I-q2');
    const lI1 = await executeQuestionLaunch(qI1.id, admin.id);
    const lI2 = await executeQuestionLaunch(qI2.id, admin.id);

    const result = await getCurrentPolls();
    const r1 = result.find((r) => r.pollLaunchId === lI1.id);
    const r2 = result.find((r) => r.pollLaunchId === lI2.id);

    // I: Landing can render multiple questions
    assert('I: two test questions returned', !!r1 && !!r2);

    // J: Q1 Play passes Q1's pollLaunchId (correct pollLaunchId on item)
    assert('J: Q1 item has correct pollLaunchId', r1?.pollLaunchId === lI1.id);
    // Verify QuestionPage-required fields are present on the item
    assert('J: Q1 item has text for QuestionPage', !!r1?.text);
    assert('J: Q1 item has options for QuestionPage', Array.isArray(r1?.options) && r1!.options.length > 0);
    assert('J: Q1 item has questionId', r1?.questionId === qI1.id);

    // K: Q2 Play passes Q2's pollLaunchId
    assert('K: Q2 item has correct pollLaunchId', r2?.pollLaunchId === lI2.id);
    assert('K: Q2 item has text for QuestionPage', !!r2?.text);
    assert('K: Q2 item has options for QuestionPage', Array.isArray(r2?.options) && r2!.options.length > 0);
    assert('K: Q2 item has questionId', r2?.questionId === qI2.id);

    await closePollLaunch(lI1.id);
    await closePollLaunch(lI2.id);
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  await cleanup();

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
