import prisma from './src/lib/prisma';


const API_URL = 'http://localhost:3001/api';

async function req(path: string, options: any = {}): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign({ status: res.status }, data);
  }
  return data;
}

// Ensure fetch is available


async function runTests() {
  console.log('--- STARTING OVERALL LEADERBOARD PHASE 2B TESTS ---');
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  };

  // Helper to create students and bypass UI
  async function createStudent(nickname: string, currentStreak: number = 0) {
    return await prisma.student.create({
      data: {
        nickname,
        passwordHash: 'dummy',
        currentStreak
      }
    });
  }

  const admin = await prisma.admin.findFirst() || await prisma.admin.create({
    data: { email: `admin_${Date.now()}@test.com`, passwordHash: 'dummy', role: 'SUPER_ADMIN' }
  });

  const question = await prisma.question.create({
    data: {
      text: 'Phase 2B Question',
      options: ['A', 'B'],
      correctIndex: 0,
      timerSeconds: 30,
      points: 10,
      createdById: admin.id
    }
  });
  const launch = await prisma.pollLaunch.create({
    data: { questionId: question.id, launchedById: admin.id }
  });

  const questionZero = await prisma.question.create({
    data: {
      text: 'Phase 2B Zero Point',
      options: ['A', 'B'],
      correctIndex: 0,
      timerSeconds: 30,
      points: 0,
      createdById: admin.id
    }
  });
  const launchZero = await prisma.pollLaunch.create({
    data: { questionId: questionZero.id, launchedById: admin.id }
  });

  const launch2 = await prisma.pollLaunch.create({
    data: { questionId: question.id, launchedById: admin.id }
  });
  const launch3 = await prisma.pollLaunch.create({
    data: { questionId: question.id, launchedById: admin.id }
  });

  // Test setup
  const now = new Date();
  const currentIst = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  
  // Create past dates
  const yesterdayIst = new Date(currentIst.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayUtc = new Date(yesterdayIst.getTime() - 5.5 * 60 * 60 * 1000);

  const lastWeekIst = new Date(currentIst.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastWeekUtc = new Date(lastWeekIst.getTime() - 5.5 * 60 * 60 * 1000);

  // Clear previous attempts for isolated testing
  await prisma.attempt.deleteMany({});
  await prisma.follow.deleteMany({});
  await prisma.student.deleteMany({});

  // ----------------------------------------------------
  // TEST 1 — Total score
  // ----------------------------------------------------
  const s1 = await createStudent('s1_score', 0);
  const s2 = await createStudent('s2_score', 0);

  await prisma.attempt.createMany({
    data: [
      { studentId: s1.id, pollLaunchId: launch.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 10, submittedAt: now },
      { studentId: s1.id, pollLaunchId: launchZero.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 20, submittedAt: now }, // artificially 20
      { studentId: s2.id, pollLaunchId: launch.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 20, submittedAt: now }
    ]
  });

  let res = await req('/leaderboards/overall?period=all-time');
  assert(res.entries[0].nickname === 's1_score' && res.entries[1].nickname === 's2_score', 'TEST 1 - Total score sorting (30 > 20)');

  // Clear
  await prisma.attempt.deleteMany({});
  await prisma.student.deleteMany({});

  // ----------------------------------------------------
  // TEST 2 — Current streak tie-break
  // ----------------------------------------------------
  const s3 = await createStudent('s3_streak', 8);
  const s4 = await createStudent('s4_streak', 5);

  await prisma.attempt.createMany({
    data: [
      { studentId: s3.id, pollLaunchId: launch.id, result: 'CORRECT', timeTakenMs: 5000, awardedPoints: 30, submittedAt: now },
      { studentId: s4.id, pollLaunchId: launch.id, result: 'CORRECT', timeTakenMs: 5000, awardedPoints: 30, submittedAt: now }
    ]
  });

  res = await req('/leaderboards/overall?period=all-time');
  assert(res.entries[0].nickname === 's3_streak' && res.entries[1].nickname === 's4_streak', 'TEST 2 - Current streak tie-break (8 > 5)');

  await prisma.attempt.deleteMany({});
  await prisma.student.deleteMany({});

  // ----------------------------------------------------
  // TEST 3 — Average time tie-break
  // ----------------------------------------------------
  const s5 = await createStudent('s5_time', 5);
  const s6 = await createStudent('s6_time', 5);

  await prisma.attempt.createMany({
    data: [
      { studentId: s5.id, pollLaunchId: launch.id, result: 'CORRECT', timeTakenMs: 4000, awardedPoints: 30, submittedAt: now },
      { studentId: s6.id, pollLaunchId: launch.id, result: 'CORRECT', timeTakenMs: 6000, awardedPoints: 30, submittedAt: now }
    ]
  });

  res = await req('/leaderboards/overall?period=all-time');
  assert(res.entries[0].nickname === 's5_time' && res.entries[1].nickname === 's6_time', 'TEST 3 - Average time tie-break (4000 < 6000)');

  await prisma.attempt.deleteMany({});
  await prisma.student.deleteMany({});

  // ----------------------------------------------------
  // TEST 4, 5, 6 — Zero-point, Wrong, Timeout
  // ----------------------------------------------------
  const s7 = await createStudent('s7_mixed', 0);
  await prisma.attempt.createMany({
    data: [
      { studentId: s7.id, pollLaunchId: launch.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 10, submittedAt: now },
      { studentId: s7.id, pollLaunchId: launchZero.id, result: 'CORRECT', timeTakenMs: 2000, awardedPoints: 0, submittedAt: now }, // Zero point
      { studentId: s7.id, pollLaunchId: launch2.id, result: 'WRONG', timeTakenMs: 3000, awardedPoints: 0, submittedAt: now }, // Wrong
      { studentId: s7.id, pollLaunchId: launch3.id, result: 'TIMEOUT', timeTakenMs: null, awardedPoints: 0, submittedAt: now } // Timeout
    ]
  });

  res = await req('/leaderboards/overall?period=all-time');
  assert(res.entries[0].score === 10, 'TEST 4,5,6 - Score remains unchanged with zero-point, wrong, and timeout');
  // Average time should be (1000 + 2000 + 3000) / 3 = 2000. Timeout is ignored.
  assert(res.entries[0].averageTimeMs === 2000, 'TEST 4,5,6 - Average time excludes timeout');

  await prisma.attempt.deleteMany({});
  await prisma.student.deleteMany({});

  // ----------------------------------------------------
  // TEST 7 — Historical score stability
  // ----------------------------------------------------
  const s8 = await createStudent('s8_hist', 0);
  await prisma.attempt.create({
    data: { studentId: s8.id, pollLaunchId: launch.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 10, submittedAt: now }
  });
  
  await prisma.question.update({ where: { id: question.id }, data: { points: 20 } });
  
  res = await req('/leaderboards/overall?period=all-time');
  assert(res.entries[0].score === 10, 'TEST 7 - Historical score stability');

  await prisma.attempt.deleteMany({});
  await prisma.student.deleteMany({});

  // ----------------------------------------------------
  // TEST 8 — Daily filter
  // ----------------------------------------------------
  const s9 = await createStudent('s9_daily', 0);
  await prisma.attempt.createMany({
    data: [
      { studentId: s9.id, pollLaunchId: launch.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 10, submittedAt: now },
      { studentId: s9.id, pollLaunchId: launchZero.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 20, submittedAt: yesterdayUtc }
    ]
  });

  res = await req('/leaderboards/overall?period=daily');
  assert(res.entries[0].score === 10, 'TEST 8 - Daily filter only includes today');

  await prisma.attempt.deleteMany({});
  await prisma.student.deleteMany({});

  // ----------------------------------------------------
  // TEST 9 — Weekly filter
  // ----------------------------------------------------
  const s10 = await createStudent('s10_weekly', 0);
  await prisma.attempt.createMany({
    data: [
      { studentId: s10.id, pollLaunchId: launch.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 10, submittedAt: now },
      { studentId: s10.id, pollLaunchId: launchZero.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 20, submittedAt: lastWeekUtc }
    ]
  });

  res = await req('/leaderboards/overall?period=weekly');
  assert(res.entries[0].score === 10, 'TEST 9 - Weekly filter only includes this week');

  // TEST 10 - All time includes everything
  res = await req('/leaderboards/overall?period=all-time');
  assert(res.entries[0].score === 30, 'TEST 10 - All time includes everything');

  await prisma.attempt.deleteMany({});
  await prisma.student.deleteMany({});

  // ----------------------------------------------------
  // TEST 11 — Top 10
  // ----------------------------------------------------
  const stPromises = [];
  for (let i = 0; i < 15; i++) {
    stPromises.push(createStudent(`s_top_${i}`, 0));
  }
  const sts = await Promise.all(stPromises);
  const attemptsData = sts.map((st, i) => ({
    studentId: st.id,
    pollLaunchId: launch.id,
    result: 'CORRECT' as const,
    timeTakenMs: 1000,
    awardedPoints: i + 1,
    submittedAt: now
  }));
  await prisma.attempt.createMany({ data: attemptsData });

  res = await req('/leaderboards/overall?period=all-time');
  assert(res.entries.length === 10, 'TEST 11 - Only 10 entries returned');
  assert(res.entries[0].nickname === 's_top_14', 'TEST 12 - Exact ordering (highest score first)');
  assert(res.entries[0].rank === 1 && res.entries[9].rank === 10, 'Rank maps 1 to 10');

  // ----------------------------------------------------
  // TEST 13 - Multiple PollLaunch independence
  // ----------------------------------------------------
  await prisma.attempt.deleteMany({});
  await prisma.follow.deleteMany({});
  await prisma.student.deleteMany({});

  const s11 = await createStudent('s11_multi', 0);
  await prisma.attempt.createMany({
    data: [
      { studentId: s11.id, pollLaunchId: launch.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 10, submittedAt: now },
      { studentId: s11.id, pollLaunchId: launch2.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 20, submittedAt: now },
      { studentId: s11.id, pollLaunchId: launch3.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 30, submittedAt: now }
    ]
  });

  res = await req('/leaderboards/overall?period=all-time');
  assert(res.entries[0].score === 60, 'TEST 13 - Multiple PollLaunch independence aggregates correctly');

  // ----------------------------------------------------
  // TEST 14 - Existing leaderboard regression
  // ----------------------------------------------------
  res = await req(`/poll/${launch.id}/leaderboard`);
  assert(res.top10 && Array.isArray(res.top10), 'TEST 14 - Existing per-question leaderboard endpoint returns original format');
  assert(res.top10[0].nickname === 's11_multi', 'TEST 14 - Existing per-question leaderboard behavior unchanged');

  await prisma.attempt.deleteMany({});
  await prisma.follow.deleteMany({});
  await prisma.student.deleteMany({});

  // ----------------------------------------------------
  // TEST 15 - IST boundary behavior
  // ----------------------------------------------------
  const s12 = await createStudent('s12_bounds', 0);

  // For daily: exactly around IST midnight
  // E.g. Today is something in IST. Let's make an attempt 1 ms before midnight IST.
  // currentIst has the current time + 5.5h. 
  // Midnight IST in UTC is today UTC - 5.5h.
  const midnightIstAsUtc = new Date(Date.UTC(
    currentIst.getUTCFullYear(),
    currentIst.getUTCMonth(),
    currentIst.getUTCDate(),
    0, 0, 0, 0
  )).getTime() - 5.5 * 60 * 60 * 1000;

  const oneMsBeforeMidnightIstAsUtc = new Date(midnightIstAsUtc - 1);
  const exactlyMidnightIstAsUtc = new Date(midnightIstAsUtc);

  await prisma.attempt.createMany({
    data: [
      { studentId: s12.id, pollLaunchId: launch.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 10, submittedAt: oneMsBeforeMidnightIstAsUtc }, // yesterday
      { studentId: s12.id, pollLaunchId: launch2.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 20, submittedAt: exactlyMidnightIstAsUtc } // today
    ]
  });

  res = await req('/leaderboards/overall?period=daily');
  assert(res.entries[0]?.score === 20, 'TEST 15 - Daily IST boundary exactly around midnight');

  await prisma.attempt.deleteMany({});

  // For weekly: Sunday -> Monday boundary
  // currentIst is some day of the week.
  // Start of this week (Monday) IST in UTC:
  const dayOfWeek = currentIst.getUTCDay(); // 0 = Sunday, 1 = Monday
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfIstWeekAsUtc = new Date(Date.UTC(
    currentIst.getUTCFullYear(),
    currentIst.getUTCMonth(),
    currentIst.getUTCDate() - diffToMonday,
    0, 0, 0, 0
  )).getTime() - 5.5 * 60 * 60 * 1000;

  const sundayBeforeWeekAsUtc = new Date(startOfIstWeekAsUtc - 1); // 1 ms before Monday
  const mondayStartAsUtc = new Date(startOfIstWeekAsUtc);

  await prisma.attempt.createMany({
    data: [
      { studentId: s12.id, pollLaunchId: launch.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 10, submittedAt: sundayBeforeWeekAsUtc }, // last week
      { studentId: s12.id, pollLaunchId: launch2.id, result: 'CORRECT', timeTakenMs: 1000, awardedPoints: 20, submittedAt: mondayStartAsUtc } // this week
    ]
  });

  res = await req('/leaderboards/overall?period=weekly');
  assert(res.entries[0]?.score === 20, 'TEST 15 - Weekly IST boundary Sunday -> Monday transition');

  await prisma.attempt.deleteMany({});
  await prisma.follow.deleteMany({});
  await prisma.student.deleteMany({});

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
