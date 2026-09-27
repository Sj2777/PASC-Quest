import { PrismaClient } from '@prisma/client';
import { getStudentStats } from '../src/services/statsService';

const prisma = new PrismaClient();

async function runTests() {
  console.log("--- STARTING PROFILE PHASE 4A PART 1 TESTS ---");
  
  // Cleanup
  await prisma.attempt.deleteMany();
  await prisma.pollLaunch.deleteMany();
  await prisma.question.deleteMany();
  await prisma.student.deleteMany();
  await prisma.admin.deleteMany();

  // Setup admin & student
  const admin = await prisma.admin.create({
    data: { email: 'test_prof_admin@example.com', passwordHash: 'hash', role: 'ADMIN' }
  });
  
  const student = await prisma.student.create({
    data: { nickname: 'ProfStudent', passwordHash: 'hash' }
  });

  // TEST 1: No attempts -> 0 total points
  let stats = await getStudentStats(student.id);
  if (stats.totalPoints !== 0) throw new Error("Expected totalPoints 0 when no attempts");
  if (stats.questionArchive.length !== 0) throw new Error("Expected empty questionArchive");
  console.log("✅ PASS: No attempts -> 0 totalPoints");

  // Create Question 1 (10 pts) and Question 2 (20 pts), Question 3 (0 pts)
  const q1 = await prisma.question.create({
    data: { text: "Q1", options: ["A", "B", "C"], correctIndex: 1, timerSeconds: 30, points: 10, createdById: admin.id }
  });
  const q2 = await prisma.question.create({
    data: { text: "Q2", options: ["X", "Y"], correctIndex: 0, timerSeconds: 30, points: 20, createdById: admin.id }
  });
  const q3 = await prisma.question.create({
    data: { text: "Q3", options: ["T", "F"], correctIndex: 0, timerSeconds: 30, points: 0, createdById: admin.id }
  });
  const qUnlaunched = await prisma.question.create({
    data: { text: "Never Launched", options: ["1"], correctIndex: 0, timerSeconds: 30, points: 50, createdById: admin.id }
  });

  // TEST 2: Never launched question does not appear
  stats = await getStudentStats(student.id);
  if (stats.questionArchive.some(q => q.questionId === qUnlaunched.id)) {
    throw new Error("Never launched question appeared in archive");
  }
  console.log("✅ PASS: Never-launched question does not appear in archive");

  // Launch Q1
  const pl1 = await prisma.pollLaunch.create({
    data: { questionId: q1.id, launchedById: admin.id }
  });

  // Launch Q1 again (multiple launches)
  const pl1_2 = await prisma.pollLaunch.create({
    data: { questionId: q1.id, launchedById: admin.id }
  });

  // Launch Q2
  const pl2 = await prisma.pollLaunch.create({
    data: { questionId: q2.id, launchedById: admin.id }
  });

  // TEST 3: Launched question appears, options NOT returned, correctAnswer is returned
  stats = await getStudentStats(student.id);
  const arch1 = stats.questionArchive.find(q => q.questionId === q1.id);
  if (!arch1) throw new Error("Launched question missing from archive");
  if (arch1.correctAnswer !== "B") throw new Error(`Incorrect correctAnswer: ${arch1.correctAnswer}`);
  if ((arch1 as any).options !== undefined) throw new Error("Options array was returned");
  console.log("✅ PASS: Launched question appears in archive with correct answer, without options");

  // TEST 4: Multiple PollLaunches do not duplicate question
  const q1Entries = stats.questionArchive.filter(q => q.questionId === q1.id);
  if (q1Entries.length !== 1) throw new Error(`Expected 1 entry for Q1, found ${q1Entries.length}`);
  console.log("✅ PASS: Multiple PollLaunches of the same Question do not create unwanted duplicates");

  // Add Attempts
  // Q1 -> Correct -> 10 pts
  await prisma.attempt.create({
    data: { studentId: student.id, pollLaunchId: pl1.id, result: 'CORRECT', awardedPoints: 10, selectedOption: 1, timeTakenMs: 1000 }
  });
  // Q2 -> Wrong -> 0 pts
  await prisma.attempt.create({
    data: { studentId: student.id, pollLaunchId: pl2.id, result: 'WRONG', awardedPoints: 0, selectedOption: 1, timeTakenMs: 1000 }
  });
  // Q1 again -> Correct -> 10 pts
  await prisma.attempt.create({
    data: { studentId: student.id, pollLaunchId: pl1_2.id, result: 'CORRECT', awardedPoints: 10, selectedOption: 1, timeTakenMs: 1000 }
  });

  stats = await getStudentStats(student.id);
  // TEST 5: Total points
  if (stats.totalPoints !== 20) throw new Error(`Expected totalPoints 20, got ${stats.totalPoints}`);
  console.log("✅ PASS: Correct attempts contribute to totalPoints, wrong attempts add 0, multiple attempts sum correctly");

  // TEST 6: Editing Question.points does not change totalPoints
  await prisma.question.update({
    where: { id: q1.id },
    data: { points: 100 }
  });
  stats = await getStudentStats(student.id);
  if (stats.totalPoints !== 20) throw new Error(`totalPoints changed to ${stats.totalPoints} after modifying Question.points`);
  console.log("✅ PASS: Editing Question.points later does NOT change historical totalPoints");

  // TEST 7: Attempt answer is NOT returned in archive
  if (stats.questionArchive.some((q: any) => q.selectedOption !== undefined || q.result !== undefined)) {
    throw new Error("Student's attempt answer was returned in archive");
  }
  console.log("✅ PASS: Student's attempt answer is NOT returned in archive");

  console.log("\nResults: All profile tests passed.");
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
