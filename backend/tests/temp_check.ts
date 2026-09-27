import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('--- 1. CURRENT STUDENTS ---');
  const students = await prisma.student.findMany({
    select: { id: true, nickname: true, branch: true }
  });
  console.table(students);

  console.log('\n--- 2. CURRENT ATTEMPTS ---');
  const attempts = await prisma.attempt.findMany({
    include: { student: { select: { nickname: true, branch: true } } }
  });
  console.table(attempts.map(a => ({
    nickname: a.student.nickname,
    branch: a.student.branch,
    attemptId: a.id,
    pollLaunchId: a.pollLaunchId,
    result: a.result,
    submittedAt: a.submittedAt,
    timeTakenMs: a.timeTakenMs
  })));

  console.log('\n--- 8. API RESPONSE ---');
  try {
    const res = await fetch('http://localhost:3001/api/leaderboards/branch-battle');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error('Failed to fetch API:', e.message);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
