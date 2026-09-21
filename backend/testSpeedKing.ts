import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
async function fetchSpeedKing() {
  const now = new Date();
  const currentIst = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const todayStartIst = new Date(currentIst);
  todayStartIst.setUTCHours(0, 0, 0, 0);
  const tomorrowStartIst = new Date(todayStartIst);
  tomorrowStartIst.setUTCDate(tomorrowStartIst.getUTCDate() + 1);
  const todayStartUtc = new Date(todayStartIst.getTime() - 5.5 * 60 * 60 * 1000);
  const tomorrowStartUtc = new Date(tomorrowStartIst.getTime() - 5.5 * 60 * 60 * 1000);

  const speedKingAttempt = await prisma.attempt.findFirst({
    where: {
      submittedAt: { gte: todayStartUtc, lt: tomorrowStartUtc },
      result: 'CORRECT',
      timeTakenMs: { not: null }
    },
    orderBy: [
      { timeTakenMs: 'asc' },
      { submittedAt: 'asc' }
    ],
    include: { student: { select: { nickname: true } } }
  });

  if (!speedKingAttempt) return null;
  return {
    nickname: speedKingAttempt.student.nickname,
    timeTakenMs: speedKingAttempt.timeTakenMs,
    submittedAt: speedKingAttempt.submittedAt
  };
}

async function run() {
  console.log('--- Speed King Tests ---');
  
  const question = await prisma.question.findFirst();
  const admin = await prisma.admin.findFirst();

  if (!question || !admin) {
    console.error('Missing seed data');
    return;
  }

  const testId = Date.now();
  const attemptIds: string[] = [];
  const launchIds: string[] = [];
  const studentIds: string[] = [];

  try {
    const t1 = await prisma.student.create({ data: { nickname: `sk_tester_${testId}_1`, passwordHash: 'hash', branch: 'COMP' }});
    const t2 = await prisma.student.create({ data: { nickname: `sk_tester_${testId}_2`, passwordHash: 'hash', branch: 'COMP' }});
    studentIds.push(t1.id, t2.id);

    const launch = await prisma.pollLaunch.create({
      data: { questionId: question.id, launchedById: admin.id }
    });
    launchIds.push(launch.id);

    const now = new Date();
    // Yesterday for test F
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // A. No attempts today
    console.log('\nA. No attempts today');
    let sk = await fetchSpeedKing();
    // We can't guarantee 'sk' is null because real users might have played, but we log it anyway.
    console.log('Result (might not be null if real users played):', sk); 

    // F. Previous-day correct attempt with 100ms
    console.log('\nF. Previous-day correct attempt with 100ms');
    attemptIds.push((await prisma.attempt.create({
      data: {
        pollLaunchId: launch.id,
        studentId: t1.id,
        result: 'CORRECT',
        timeTakenMs: 100,
        submittedAt: yesterday
      }
    })).id);
    sk = await fetchSpeedKing();
    console.log('Result:', sk); 

    // B. One correct attempt with timeTakenMs
    console.log('\nB. One correct attempt with timeTakenMs');
    let launchB = await prisma.pollLaunch.create({ data: { questionId: question.id, launchedById: admin.id } });
    launchIds.push(launchB.id);
    attemptIds.push((await prisma.attempt.create({
      data: {
        pollLaunchId: launchB.id,
        studentId: t1.id,
        result: 'CORRECT',
        timeTakenMs: 3000,
        submittedAt: now
      }
    })).id);
    sk = await fetchSpeedKing();
    console.log('Result:', sk); 

    // C. Two correct attempts (t2 = 1800ms)
    console.log('\nC. Two correct attempts (t1=3000, t2=1800)');
    let launchC = await prisma.pollLaunch.create({ data: { questionId: question.id, launchedById: admin.id } });
    launchIds.push(launchC.id);
    attemptIds.push((await prisma.attempt.create({
      data: {
        pollLaunchId: launchC.id,
        studentId: t2.id,
        result: 'CORRECT',
        timeTakenMs: 1800,
        submittedAt: new Date(now.getTime() + 1000)
      }
    })).id);
    sk = await fetchSpeedKing();
    console.log('Result:', sk); 

    // D. Wrong attempt with 500ms
    console.log('\nD. Wrong attempt with 500ms (t1)');
    let launchD = await prisma.pollLaunch.create({ data: { questionId: question.id, launchedById: admin.id } });
    launchIds.push(launchD.id);
    attemptIds.push((await prisma.attempt.create({
      data: {
        pollLaunchId: launchD.id,
        studentId: t1.id,
        result: 'WRONG',
        timeTakenMs: 500,
        submittedAt: new Date(now.getTime() + 2000)
      }
    })).id);
    sk = await fetchSpeedKing();
    console.log('Result:', sk); 

    // E. Correct attempt with null timeTakenMs
    console.log('\nE. Correct attempt with null timeTakenMs (t1)');
    let launchE = await prisma.pollLaunch.create({ data: { questionId: question.id, launchedById: admin.id } });
    launchIds.push(launchE.id);
    attemptIds.push((await prisma.attempt.create({
      data: {
        pollLaunchId: launchE.id,
        studentId: t1.id,
        result: 'CORRECT',
        timeTakenMs: null,
        submittedAt: new Date(now.getTime() + 3000)
      }
    })).id);
    sk = await fetchSpeedKing();
    console.log('Result:', sk); 

    // G. Same response time for two students
    console.log('\nG. Same response time for two students');
    
    let launchG = await prisma.pollLaunch.create({ data: { questionId: question.id, launchedById: admin.id } });
    launchIds.push(launchG.id);
    attemptIds.push((await prisma.attempt.create({
      data: {
        pollLaunchId: launchG.id,
        studentId: t1.id,
        result: 'CORRECT',
        timeTakenMs: 2000,
        submittedAt: now
      }
    })).id);
    attemptIds.push((await prisma.attempt.create({
      data: {
        pollLaunchId: launchG.id,
        studentId: t2.id,
        result: 'CORRECT',
        timeTakenMs: 2000,
        submittedAt: new Date(now.getTime() + 1000) 
      }
    })).id);
    
    sk = await fetchSpeedKing();
    console.log('Result:', sk); 

    console.log('\n--- Tests Complete ---');
  } finally {
    console.log('Cleaning up test fixtures...');
    if (attemptIds.length > 0) {
      await prisma.attempt.deleteMany({ where: { id: { in: attemptIds } } });
    }
    if (launchIds.length > 0) {
      await prisma.pollLaunch.deleteMany({ where: { id: { in: launchIds } } });
    }
    if (studentIds.length > 0) {
      await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
