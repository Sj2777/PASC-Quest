import prisma from './src/lib/prisma';
import bcrypt from 'bcrypt';
import WebSocket from 'ws';

const API_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001';

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

async function runTests() {
  console.log('--- STARTING WEBSOCKET PHASE 1 TESTS ---');
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

  // 1 & 2. WebSocket connection
  const ws = new WebSocket(WS_URL);
  
  const connectionPromise = new Promise<void>((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
    setTimeout(() => reject(new Error('WS connection timeout')), 2000);
  });

  try {
    await connectionPromise;
    assert(true, 'WebSocket server starts successfully and client can connect');
  } catch (err: any) {
    assert(false, `WebSocket connection failed: ${err.message}`);
    process.exit(1);
  }

  const messages: any[] = [];
  ws.on('message', (data) => {
    messages.push(JSON.parse(data.toString()));
  });

  // Setup Admin & Question
  const email = `admin_ws_${Date.now()}@test.com`;
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.admin.create({
    data: { email, passwordHash, role: 'SUPER_ADMIN' },
  });

  const loginRes = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!loginRes.ok) {
    const text = await loginRes.text();
    console.error('Admin login failed:', loginRes.status, text);
    process.exit(1);
  }

  const cookieHeaderRaw = loginRes.headers.get('set-cookie') || '';
  const cookieHeader = cookieHeaderRaw.split(';')[0];
  console.log('Got admin cookie:', cookieHeader);

  const q = await req('/admin/questions', {
    method: 'POST',
    headers: { Cookie: cookieHeader },
    body: JSON.stringify({
      text: 'WS test q',
      options: ['A', 'B'],
      correctIndex: 0,
      timerSeconds: 30,
      points: 10
    }),
  });

  const launchRes = await req(`/admin/questions/${q.id}/launch`, {
    method: 'POST',
    headers: { Cookie: cookieHeader },
  });

  // Setup Student
  const nickname = `stw_${Date.now().toString().slice(-8)}`;
  const sRes = await fetch(`${API_URL}/student/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, password: 'password', branch: 'COMP', division: 'A', year: 'FE' }),
  });
  if (!sRes.ok) {
    const text = await sRes.text();
    console.error('Student registration failed:', sRes.status, text);
    process.exit(1);
  }
  const sCookieHeaderRaw = sRes.headers.get('set-cookie') || '';
  const sCookieHeader = sCookieHeaderRaw.split(';')[0];
  console.log('Got student cookie:', sCookieHeader);

  const startRes = await req(`/poll/${launchRes.id}/start`, {
    method: 'POST',
    headers: { Cookie: sCookieHeader },
  });

  // 3 & 4. Valid attempt broadcasts two events
  messages.length = 0; // clear messages
  const attRes = await req('/poll/attempts', {
    method: 'POST',
    headers: { Cookie: sCookieHeader },
    body: JSON.stringify({ token: startRes.token, selectedOption: 0 }),
  });

  assert(attRes.result === 'correct', 'Existing attempt submission behavior remains unchanged');
  
  // Wait a little for WS messages
  await new Promise((resolve) => setTimeout(resolve, 500));

  const overallEvent = messages.find(m => m.type === 'LEADERBOARD_UPDATED' && m.scope === 'overall');
  const pollEvent = messages.find(m => m.type === 'LEADERBOARD_UPDATED' && m.scope === 'poll');

  assert(!!overallEvent, 'Client receives { scope: "overall" } event on successful attempt');
  assert(!!pollEvent && pollEvent.pollLaunchId === launchRes.id, 'Client receives { scope: "poll" } event on successful attempt');

  // 5. Invalid attempt does not broadcast
  messages.length = 0;
  
  const startRes2 = await req(`/poll/${launchRes.id}/start`, {
    method: 'POST',
    headers: { Cookie: sCookieHeader },
  }).catch(() => null); // Should fail since student already played

  try {
    await req('/poll/attempts', {
      method: 'POST',
      headers: { Cookie: sCookieHeader },
      body: JSON.stringify({ token: startRes.token, selectedOption: 1 }), // re-use token, should fail or be rejected
    });
    assert(false, 'Expected invalid attempt to fail');
  } catch (err: any) {
    assert(err.status === 409 || err.status === 401 || err.status === 400 || err.status === 500, 'Invalid attempt failed as expected');
  }

  await new Promise((resolve) => setTimeout(resolve, 500));
  assert(messages.length === 0, 'An invalid/failed attempt does NOT broadcast either event');

  // 7. REST leaderboard still works
  const lbRes = await req(`/leaderboards/overall`, {});
  assert(Array.isArray(lbRes.entries), 'Existing REST leaderboard endpoints still work (overall)');

  const pollLbRes = await req(`/poll/${launchRes.id}/leaderboard`, {});
  assert(pollLbRes.total > 0, 'Existing REST leaderboard endpoints still work (poll)');

  // 6. Disconnect does not crash
  ws.close();
  await new Promise((resolve) => setTimeout(resolve, 500));

  const pingRes = await req('/ping');
  assert(pingRes.pong === true, 'Disconnecting a client does not crash the server');

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
