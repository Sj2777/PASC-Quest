import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("--- Cleanup Test Data ---");

  // Find ghost_testers
  const ghostTesters = await prisma.student.findMany({
    where: { nickname: { startsWith: 'ghost_tester_' } }
  });
  
  const ghostTesterIds = ghostTesters.map(s => s.id);
  console.log(`Found ${ghostTesterIds.length} ghost_tester_* students.`);

  // Find their attempts
  const ghostAttempts = await prisma.attempt.findMany({
    where: { studentId: { in: ghostTesterIds } }
  });
  console.log(`Found ${ghostAttempts.length} attempts from ghost_tester_* students.`);

  // Find poll launches that ONLY have ghost attempts (or no attempts) and were created recently?
  // Actually, we can find all poll launches that these attempts belong to.
  const ghostLaunchIds = [...new Set(ghostAttempts.map(a => a.pollLaunchId))];
  
  // Verify if these launches have any attempts from REAL students.
  const realAttemptsInGhostLaunches = await prisma.attempt.count({
    where: {
      pollLaunchId: { in: ghostLaunchIds },
      studentId: { notIn: ghostTesterIds }
    }
  });

  const launchesToDelete = realAttemptsInGhostLaunches === 0 ? ghostLaunchIds : [];
  console.log(`Found ${launchesToDelete.length} poll launches that are exclusively used by ghost_tester_* attempts.`);

  // What about testSpeedKing.ts attempts?
  // testSpeedKing creates attempts for testplayer1 and testplayer2 with specific timeTakenMs.
  // E.g. timeTakenMs = 100, 3000, 1800, 500, 2000.
  // Since testplayer1/2 are seed students, we should only delete their test attempts.
  // Wait, if testSpeedKing.ts deletes ALL attempts, then any attempt by testplayer1/2 right now might be from the test script (or the user playing manually).
  // Let's find attempts by testplayer1/testplayer2 that look like testSpeedKing artifacts.
  const testPlayerIds = (await prisma.student.findMany({
    where: { nickname: { in: ['testplayer1', 'testplayer2'] } }
  })).map(s => s.id);

  const suspectAttempts = await prisma.attempt.findMany({
    where: {
      studentId: { in: testPlayerIds },
      timeTakenMs: { in: [100, 3000, 1800, 500, 2000] }
    }
  });
  console.log(`Found ${suspectAttempts.length} suspect attempts from testplayer1/2 matching testSpeedKing.ts exact timeTakenMs.`);

  // Plan deletion
  console.log("--- Deletion Plan ---");
  console.log(`1. Delete ${ghostAttempts.length} ghost attempts.`);
  console.log(`2. Delete ${launchesToDelete.length} ghost-only poll launches.`);
  console.log(`3. Delete ${ghostTesters.length} ghost_tester_* students.`);
  console.log(`4. Delete ${suspectAttempts.length} suspect testSpeedKing attempts.`);

  // Execute deletion in order to maintain referential integrity
  const delAttempts = await prisma.attempt.deleteMany({
    where: {
      id: { in: [...ghostAttempts.map(a => a.id), ...suspectAttempts.map(a => a.id)] }
    }
  });
  console.log(`Deleted ${delAttempts.count} attempts.`);

  if (launchesToDelete.length > 0) {
    const delLaunches = await prisma.pollLaunch.deleteMany({
      where: { id: { in: launchesToDelete } }
    });
    console.log(`Deleted ${delLaunches.count} poll launches.`);
  }

  const delStudents = await prisma.student.deleteMany({
    where: { id: { in: ghostTesterIds } }
  });
  console.log(`Deleted ${delStudents.count} ghost_tester_* students.`);

  console.log("Cleanup complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
