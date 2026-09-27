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
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
