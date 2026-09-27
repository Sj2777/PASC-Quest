import { PrismaClient } from '@prisma/client';
import express from 'express';
import leaderboardsRouter from '../src/routes/leaderboards';
import { executeQuestionLaunch } from '../src/services/launchService';
import http from 'http';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use('/api/leaderboards', leaderboardsRouter);

async function runTests() {
  console.log('\n══════════════════════════════════════════════');
  console.log(' Phase 7C-D Test Suite — Speed King Isolation');
  console.log('══════════════════════════════════════════════\n');

  let server: any = null;

  try {
    // Start temporary server for testing
    await new Promise<void>((resolve) => {
      server = app.listen(3333, () => resolve());
    });

    const admin = await prisma.admin.create({
      data: {
        email: `admin_${Date.now()}@test.com`,
        passwordHash: 'hash',
        role: 'ADMIN'
      }
    });

    // 1. Setup: Create Questions and Launches
    const q1 = await prisma.question.create({
      data: {
        text: 'Test Q1',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        timerSeconds: 10,
        status: 'DRAFT',
        createdById: admin.id
      },
    });

    const q2 = await prisma.question.create({
      data: {
        text: 'Test Q2',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        timerSeconds: 10,
        status: 'DRAFT',
        createdById: admin.id
      },
    });

    const launch1 = await executeQuestionLaunch(q1.id, admin.id);
    const launch2 = await executeQuestionLaunch(q2.id, admin.id);

    // 2. Setup: Create Students
    const prefix = Date.now().toString();
    const sA = await prisma.student.create({ data: { nickname: `StudentA_${prefix}`, passwordHash: 'hash', currentStreak: 0, bestStreak: 0 } });
    const sB = await prisma.student.create({ data: { nickname: `StudentB_${prefix}`, passwordHash: 'hash', currentStreak: 0, bestStreak: 0 } });
    const sC = await prisma.student.create({ data: { nickname: `StudentC_${prefix}`, passwordHash: 'hash', currentStreak: 0, bestStreak: 0 } });
    const sD = await prisma.student.create({ data: { nickname: `StudentD_${prefix}`, passwordHash: 'hash', currentStreak: 0, bestStreak: 0 } });

    // 3. Setup: Create Attempts
    const now = new Date();
    // Student A: Q1, 5000ms
    await prisma.attempt.create({
      data: {
        studentId: sA.id,
        pollLaunchId: launch1.id,
        selectedOption: 0,
        result: 'CORRECT',
        timeTakenMs: 5000,
        submittedAt: now
      }
    });

    // Student B: Q1, 7000ms
    await prisma.attempt.create({
      data: {
        studentId: sB.id,
        pollLaunchId: launch1.id,
        selectedOption: 0,
        result: 'CORRECT',
        timeTakenMs: 7000,
        submittedAt: new Date(now.getTime() + 1000)
      }
    });

    // Student C: Q2, 2000ms
    await prisma.attempt.create({
      data: {
        studentId: sC.id,
        pollLaunchId: launch2.id,
        selectedOption: 0,
        result: 'CORRECT',
        timeTakenMs: 2000,
        submittedAt: new Date(now.getTime() + 2000)
      }
    });

    // Student D: Q2, 4000ms
    await prisma.attempt.create({
      data: {
        studentId: sD.id,
        pollLaunchId: launch2.id,
        selectedOption: 0,
        result: 'CORRECT',
        timeTakenMs: 4000,
        submittedAt: new Date(now.getTime() + 3000)
      }
    });

    let passed = 0;
    let failed = 0;

    function assertEq(name: string, actual: any, expected: any) {
      if (actual === expected) {
        console.log(`  ✅ PASS: ${name}`);
        passed++;
      } else {
        console.error(`  ❌ FAIL: ${name} (Expected: ${expected}, Got: ${actual})`);
        failed++;
      }
    }

    // 4. Test Q1 Speed King
    const res1 = await fetch(`http://localhost:3333/api/leaderboards/${launch1.id}/speed-king`);
    const data1: any = await res1.json();
    assertEq('Q1 Speed King HTTP 200', res1.status, 200);
    assertEq('Q1 Speed King Nickname', data1.speedKing?.nickname, sA.nickname);
    assertEq('Q1 Speed King Time', data1.speedKing?.timeTakenMs, 5000);

    // 5. Test Q2 Speed King
    const res2 = await fetch(`http://localhost:3333/api/leaderboards/${launch2.id}/speed-king`);
    const data2: any = await res2.json();
    assertEq('Q2 Speed King HTTP 200', res2.status, 200);
    assertEq('Q2 Speed King Nickname', data2.speedKing?.nickname, sC.nickname);
    assertEq('Q2 Speed King Time', data2.speedKing?.timeTakenMs, 2000);


    console.log('\n══════════════════════════════════════════════');
    console.log(` Results: ${passed} passed, ${failed} failed`);
    console.log('══════════════════════════════════════════════\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal error in tests:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests();
