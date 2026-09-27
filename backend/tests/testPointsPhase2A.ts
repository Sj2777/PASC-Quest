
import prisma from '../src/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

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
    console.error('Request failed:', path, options.body, data);
    throw Object.assign({ status: res.status }, data);
  }
  return data;
}

async function runTests() {
  console.log('--- STARTING POINTS PHASE 2A TESTS ---');
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

  // Create an admin
  const email = `admin_${Date.now()}@test.com`;
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.admin.create({
    data: { email, passwordHash, role: 'SUPER_ADMIN' },
  });

  // Admin login to get cookie
  const loginRes = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const cookieHeader = loginRes.headers.get('set-cookie') || '';

  // 1. Question defaults to 0 points.
  let qDefault = await req('/admin/questions', {
    method: 'POST',
    headers: { Cookie: cookieHeader },
    body: JSON.stringify({
      text: 'Default points q',
      options: ['A', 'B'],
      correctIndex: 0,
      timerSeconds: 30
      // points omitted
    }),
  });
  
  let qFromDb = await prisma.question.findUnique({ where: { id: qDefault.id } });
  assert(qFromDb?.points === 0, 'Question defaults to 0 points when omitted');

  // 2. Admin can explicitly save points = 0.
  let qExplicitZero = await req('/admin/questions', {
    method: 'POST',
    headers: { Cookie: cookieHeader },
    body: JSON.stringify({
      text: 'Explicit 0 points q',
      options: ['A', 'B'],
      correctIndex: 0,
      timerSeconds: 30,
      points: 0
    }),
  });
  
  qFromDb = await prisma.question.findUnique({ where: { id: qExplicitZero.id } });
  assert(qFromDb?.points === 0, 'Admin can explicitly save points = 0');

  // 3. Admin can save points = 10.
  let qPoints = await req('/admin/questions', {
    method: 'POST',
    headers: { Cookie: cookieHeader },
    body: JSON.stringify({
      text: '10 points q',
      options: ['A', 'B'],
      correctIndex: 0,
      timerSeconds: 30,
      points: 10
    }),
  });
  
  qFromDb = await prisma.question.findUnique({ where: { id: qPoints.id } });
  assert(qFromDb?.points === 10, 'Admin can create a question with points = 10');

  // 3. Admin can edit points from 10 to 20.
  let updatedQ = await req(`/admin/questions/${qPoints.id}`, {
    method: 'PUT',
    headers: { Cookie: cookieHeader },
    body: JSON.stringify({ points: 20 }),
  });
  qFromDb = await prisma.question.findUnique({ where: { id: qPoints.id } });
  assert(qFromDb?.points === 20, 'Admin can edit points from 10 to 20');

  // 4. Negative points are rejected.
  try {
    await req('/admin/questions', {
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: JSON.stringify({
        text: 'Negative points q',
        options: ['A', 'B'],
        correctIndex: 0,
        timerSeconds: 30,
        points: -5
      }),
    });
    assert(false, 'Negative points should be rejected');
  } catch (err: any) {
    assert(err.status === 400, 'Negative points are rejected');
  }

  // 5. Non-integer points are rejected.
  try {
    await req('/admin/questions', {
      method: 'POST',
      headers: { Cookie: cookieHeader },
      body: JSON.stringify({
        text: 'Float points q',
        options: ['A', 'B'],
        correctIndex: 0,
        timerSeconds: 30,
        points: 5.5
      }),
    });
    assert(false, 'Non-integer points should be rejected');
  } catch (err: any) {
    assert(err.status === 400, 'Non-integer points are rejected');
  }

  // Create a student
  const nickname = `stud_${Date.now()}`;
  const sRes = await fetch(`${API_URL}/student/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, password: 'password', branch: 'COMP' }),
  });
  const sCookieHeader = sRes.headers.get('set-cookie') || '';

  // 6. Correct answer awards the Question's configured points.
  // 10. Historical awarded points remain stable if Question.points is edited later.
  
  // Launch qPoints (which has 20 points now)
  const launchRes = await req(`/admin/questions/${qPoints.id}/launch`, {
    method: 'POST',
    headers: { Cookie: cookieHeader },
  });
  
  let startRes = await req(`/poll/${launchRes.id}/start`, {
    method: 'POST',
    headers: { Cookie: sCookieHeader },
  });

  // Attempt correct
  let attRes = await req('/poll/attempts', {
    method: 'POST',
    headers: { Cookie: sCookieHeader },
    body: JSON.stringify({ token: startRes.token, selectedOption: 0 }),
  });
  
  assert(attRes.result === 'correct', 'Student answered correctly');
  let attDb = await prisma.attempt.findFirst({ where: { pollLaunchId: launchRes.id } });
  assert(attDb?.awardedPoints === 20, 'Correct answer awards the configured points (20)');
  
  // Edit Question points to 50
  // Note: we can't edit via API because it has launches (unless we bypass the guard).
  // The backend has a guard `if (existing.launches.length > 0) error`.
  // So we'll edit directly via prisma to simulate an admin bypassing or a future feature.
  await prisma.question.update({ where: { id: qPoints.id }, data: { points: 50 } });
  
  // Check historical
  attDb = await prisma.attempt.findFirst({ where: { pollLaunchId: launchRes.id } });
  assert(attDb?.awardedPoints === 20, 'Historical awarded points remain stable if Question.points is edited later');

  // 7. Wrong answer awards 0.
  // We need a new student for the same launch, or a new launch.
  const nickname2 = `stud2_${Date.now()}`;
  const sRes2 = await fetch(`${API_URL}/student/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname: nickname2, password: 'password', branch: 'COMP' }),
  });
  const sCookieHeader2 = sRes2.headers.get('set-cookie') || '';
  
  let startRes2 = await req(`/poll/${launchRes.id}/start`, {
    method: 'POST',
    headers: { Cookie: sCookieHeader2 },
  });
  await req('/poll/attempts', {
    method: 'POST',
    headers: { Cookie: sCookieHeader2 },
    body: JSON.stringify({ token: startRes2.token, selectedOption: 1 }), // wrong
  });
  
  let attDb2 = await prisma.attempt.findFirst({ where: { pollLaunchId: launchRes.id, student: { nickname: nickname2 } } });
  assert(attDb2?.awardedPoints === 0, 'Wrong answer awards 0 points');

  // 8. Timeout awards 0.
  const nickname3 = `stud3_${Date.now()}`;
  const sRes3 = await fetch(`${API_URL}/student/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname: nickname3, password: 'password', branch: 'COMP' }),
  });
  const sCookieHeader3 = sRes3.headers.get('set-cookie') || '';
  
  let startRes3 = await req(`/poll/${launchRes.id}/start`, {
    method: 'POST',
    headers: { Cookie: sCookieHeader3 },
  });
  await req('/poll/attempts', {
    method: 'POST',
    headers: { Cookie: sCookieHeader3 },
    body: JSON.stringify({ token: startRes3.token, selectedOption: null }), // timeout
  });
  
  let attDb3 = await prisma.attempt.findFirst({ where: { pollLaunchId: launchRes.id, student: { nickname: nickname3 } } });
  assert(attDb3?.awardedPoints === 0, 'Timeout awards 0 points');

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
