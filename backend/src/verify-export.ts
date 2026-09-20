import http from 'http';
import app from './index';
import prisma from './lib/prisma';
import jwt from 'jsonwebtoken';

async function run() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  console.log(`Test server running on port ${port}`);

  try {
    // 1. Check existing question in db or pick one
    const question = await prisma.question.findFirst({
      include: {
        launches: {
          include: { attempts: true },
        },
      },
    });

    if (!question) {
      console.error('No question found in DB for testing!');
      process.exit(1);
    }

    console.log(`Using question ID: ${question.id}`);

    // Create a mock admin token
    const secret = process.env.ADMIN_JWT_SECRET || 'secret';
    const validToken = jwt.sign({ adminId: 'test-admin', email: 'admin@test.com', role: 'ADMIN' }, secret);

    // Test 1: Unauthorized request (no cookie)
    console.log('\n--- Test 1: Unauthorized without cookie ---');
    const resUnauth = await fetch(`http://localhost:${port}/admin/questions/${question.id}/export.csv`);
    console.log(`Status: ${resUnauth.status} (expected 401)`);
    if (resUnauth.status !== 401) throw new Error('Expected 401 for unauthenticated request');

    // Test 2: Non-existent question
    console.log('\n--- Test 2: Non-existent question ID ---');
    const resNotFound = await fetch(`http://localhost:${port}/admin/questions/non-existent-id/export.csv`, {
      headers: { Cookie: `admin_token=${validToken}` },
    });
    console.log(`Status: ${resNotFound.status} (expected 404)`);
    if (resNotFound.status !== 404) throw new Error('Expected 404 for non-existent question');

    // Test 3: Valid export from /admin/questions/:id/export.csv
    console.log('\n--- Test 3: GET /admin/questions/:id/export.csv ---');
    const resDirect = await fetch(`http://localhost:${port}/admin/questions/${question.id}/export.csv`, {
      headers: { Cookie: `admin_token=${validToken}` },
    });
    console.log(`Status: ${resDirect.status} (expected 200)`);
    console.log(`Content-Type: ${resDirect.headers.get('content-type')}`);
    console.log(`Content-Disposition: ${resDirect.headers.get('content-disposition')}`);
    const csvContent1 = await resDirect.text();
    console.log(`CSV output preview:\n${csvContent1.slice(0, 500)}`);

    if (!resDirect.headers.get('content-type')?.includes('text/csv')) {
      throw new Error('Content-Type is not text/csv');
    }
    if (resDirect.headers.get('content-disposition') !== `attachment; filename="question-${question.id}-attempts.csv"`) {
      throw new Error(`Content-Disposition header mismatch: ${resDirect.headers.get('content-disposition')}`);
    }

    // Test 4: Valid export from /api/admin/questions/:id/export.csv
    console.log('\n--- Test 4: GET /api/admin/questions/:id/export.csv ---');
    const resApi = await fetch(`http://localhost:${port}/api/admin/questions/${question.id}/export.csv`, {
      headers: { Cookie: `admin_token=${validToken}` },
    });
    console.log(`Status: ${resApi.status} (expected 200)`);
    const csvContent2 = await resApi.text();
    if (csvContent1 !== csvContent2) {
      throw new Error('Outputs between /admin and /api/admin routes do not match!');
    }

    // Verify first row headers
    const lines = csvContent1.trim().split('\n');
    console.log(`Total CSV lines: ${lines.length}`);
    const expectedHeader = 'student nickname,pollLaunchId,launchedAt,isCorrect,timeTakenMs,submittedAt';
    if (lines[0].replace('\r', '') !== expectedHeader) {
      throw new Error(`Header mismatch! Got: ${lines[0]}, expected: ${expectedHeader}`);
    }

    console.log('\nALL CSV EXPORT INTEGRATION CHECKS PASSED!');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
