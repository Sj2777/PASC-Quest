import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    select: {
      id: true,
      nickname: true,
      branch: true
    }
  });

  console.log("=== All Students ===");
  students.forEach(s => {
    console.log(`- ID: ${s.id} | Nickname: ${s.nickname} | Branch: ${s.branch === null ? 'NULL' : s.branch}`);
  });

  console.log("\n=== Counts by Branch ===");
  const counts = students.reduce((acc, s) => {
    const b = s.branch === null ? 'NULL' : s.branch;
    acc[b] = (acc[b] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.dir(counts);

  const admins = await prisma.admin.findMany();
  console.log("\n=== All Admins ===");
  admins.forEach(a => console.log(`- ID: ${a.id} | Email: ${a.email} | Role: ${a.role}`));

  const questions = await prisma.question.findMany({
    select: { id: true, text: true, points: true, status: true }
  });
  console.log("\n=== All Questions ===");
  questions.forEach(q => console.log(`- ID: ${q.id} | Points: ${q.points} | Status: ${q.status} | Text: ${q.text.slice(0, 30)}...`));

  // Repair: Update questions with 0 points to 50 points
  await prisma.question.updateMany({
    where: { points: 0 },
    data: { points: 50 },
  });

  // Repair: Update correct attempts with 0 points to 50 points
  await prisma.attempt.updateMany({
    where: { result: 'CORRECT', awardedPoints: 0 },
    data: { awardedPoints: 50 },
  });

  const updatedAttempts = await prisma.attempt.findMany({
    select: { id: true, studentId: true, result: true, awardedPoints: true }
  });
  console.log("\n=== Updated Attempts ===");
  updatedAttempts.forEach(att => console.log(`- Student: ${att.studentId} | Result: ${att.result} | Awarded: ${att.awardedPoints}`));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
