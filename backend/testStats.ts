import { PrismaClient } from '@prisma/client';
import { getStudentStats } from './src/services/statsService';

const prisma = new PrismaClient();

async function run() {
  const t1 = await prisma.student.findUnique({ where: { nickname: 'testplayer1' } });
  const t2 = await prisma.student.findUnique({ where: { nickname: 'testplayer2' } });
  const admin = await prisma.admin.findFirst();
  const question = await prisma.question.findFirst();

  if (!t1 || !t2 || !admin || !question) {
    console.log('Missing seed data');
    return;
  }

  // Clean up any existing test data to ensure idempotence
  await prisma.attempt.deleteMany({
    where: {
      studentId: { in: [t1.id, t2.id] }
    }
  });
  
  // Create a PollLaunch
  const launch1 = await prisma.pollLaunch.create({
    data: { questionId: question.id, launchedById: admin.id }
  });

  // Add attempts
  // Day 1
  await prisma.attempt.create({
    data: {
      pollLaunchId: launch1.id,
      studentId: t1.id,
      result: 'CORRECT',
      timeTakenMs: 1500,
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    }
  });
  
  await prisma.attempt.create({
    data: {
      pollLaunchId: launch1.id,
      studentId: t2.id,
      result: 'CORRECT',
      timeTakenMs: 2000,
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    }
  });

  // Day 2
  const launch2 = await prisma.pollLaunch.create({
    data: { questionId: question.id, launchedById: admin.id }
  });

  await prisma.attempt.create({
    data: {
      pollLaunchId: launch2.id,
      studentId: t1.id,
      result: 'WRONG',
      timeTakenMs: 3000,
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
    }
  });

  // t2 does not play on day 2.

  const stats1 = await getStudentStats(t1.id);
  const stats2 = await getStudentStats(t2.id);

  console.log('testplayer1:', JSON.stringify(stats1, null, 2));
  console.log('testplayer2:', JSON.stringify(stats2, null, 2));

  // Let's debug rank inside statsService. Actually we can't easily without editing statsService, 
  // let's just log the IDs of t1 and t2 to see their uuids.
  console.log('t1 id:', t1.id);
  console.log('t2 id:', t2.id);
}

run().catch(console.error).finally(() => prisma.$disconnect());
