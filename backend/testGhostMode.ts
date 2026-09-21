import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fetchGhostMode(pollLaunchId: string) {
  const attempts = await prisma.attempt.findMany({
    where: { pollLaunchId },
    select: { result: true }
  });

  const total = attempts.length;
  if (total === 0) {
    return {
      total: 0,
      correct: 0,
      wrong: 0,
      timeout: 0,
      correctPercent: 0,
      wrongPercent: 0,
      timeoutPercent: 0
    };
  }

  let correct = 0;
  let wrong = 0;
  let timeout = 0;

  for (const a of attempts) {
    if (a.result === 'CORRECT') correct++;
    else if (a.result === 'WRONG') wrong++;
    else if (a.result === 'TIMEOUT') timeout++;
  }

  return {
    total,
    correct,
    wrong,
    timeout,
    correctPercent: (correct / total) * 100,
    wrongPercent: (wrong / total) * 100,
    timeoutPercent: (timeout / total) * 100
  };
}

async function run() {
  console.log('--- Ghost Mode Tests ---');
  
  const question = await prisma.question.findFirst();
  const admin = await prisma.admin.findFirst();

  if (!question || !admin) {
    console.error('Missing seed data');
    return;
  }

  const testId = Date.now();
  const students = [];
  const attemptIds: string[] = [];
  const launchIds: string[] = [];

  try {
    // Create 6 test students
    for (let i = 0; i < 6; i++) {
      const s = await prisma.student.create({ data: { nickname: `ghost_tester_${testId}_${i}`, passwordHash: 'hash', branch: 'COMP' } });
      students.push(s);
    }

    const launch = await prisma.pollLaunch.create({
      data: { questionId: question.id, launchedById: admin.id }
    });
    launchIds.push(launch.id);
    
    const diffLaunch = await prisma.pollLaunch.create({
      data: { questionId: question.id, launchedById: admin.id }
    });
    launchIds.push(diffLaunch.id);

    // A. No attempts
    console.log('\nA. No attempts');
    let gm = await fetchGhostMode(launch.id);
    console.log('Result:', gm);

    // B. One CORRECT attempt
    console.log('\nB. One CORRECT attempt');
    const a1 = await prisma.attempt.create({
      data: {
        pollLaunchId: launch.id,
        studentId: students[0].id,
        result: 'CORRECT',
        timeTakenMs: 1000,
      }
    });
    attemptIds.push(a1.id);
    gm = await fetchGhostMode(launch.id);
    console.log('Result:', gm);

    // D. Different poll launch attempt shouldn't affect it
    console.log('\nD. Attempts in different launch');
    const a2 = await prisma.attempt.create({
      data: {
        pollLaunchId: diffLaunch.id,
        studentId: students[0].id,
        result: 'WRONG',
        timeTakenMs: 1000,
      }
    });
    attemptIds.push(a2.id);
    gm = await fetchGhostMode(launch.id);
    console.log('Result (should be same as B):', gm);

    // C. Mixed results (3 CORRECT, 2 WRONG, 1 TIMEOUT)
    // Already have 1 CORRECT, need 2 more CORRECT, 2 WRONG, 1 TIMEOUT
    console.log('\nC. Mixed results (3C, 2W, 1T)');
    attemptIds.push((await prisma.attempt.create({ data: { pollLaunchId: launch.id, studentId: students[1].id, result: 'CORRECT', timeTakenMs: 1000 } })).id);
    attemptIds.push((await prisma.attempt.create({ data: { pollLaunchId: launch.id, studentId: students[2].id, result: 'CORRECT', timeTakenMs: 1000 } })).id);
    attemptIds.push((await prisma.attempt.create({ data: { pollLaunchId: launch.id, studentId: students[3].id, result: 'WRONG', timeTakenMs: 1000 } })).id);
    attemptIds.push((await prisma.attempt.create({ data: { pollLaunchId: launch.id, studentId: students[4].id, result: 'WRONG', timeTakenMs: 1000 } })).id);
    attemptIds.push((await prisma.attempt.create({ data: { pollLaunchId: launch.id, studentId: students[5].id, result: 'TIMEOUT', timeTakenMs: null } })).id);
    
    gm = await fetchGhostMode(launch.id);
    console.log('Result:', gm);

    // E. Verify individual student info is not returned
    console.log('\nE. Verify student info is NOT returned');
    console.log('Contains studentId or nickname? ', 'studentId' in gm || 'nickname' in gm);

    console.log('\n--- Tests Complete ---');
  } finally {
    // Cleanup
    console.log('Cleaning up test fixtures...');
    if (attemptIds.length > 0) {
      await prisma.attempt.deleteMany({ where: { id: { in: attemptIds } } });
    }
    if (launchIds.length > 0) {
      await prisma.pollLaunch.deleteMany({ where: { id: { in: launchIds } } });
    }
    if (students.length > 0) {
      await prisma.student.deleteMany({ where: { id: { in: students.map(s => s.id) } } });
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
