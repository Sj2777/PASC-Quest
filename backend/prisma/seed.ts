import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // ── Admin ──────────────────────────────────────────────────────────────────
  const email = process.env.ADMIN_EMAIL || 'admin@quizpop.dev';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });
  console.log(`✅ Admin seeded: ${admin.email}`);
  console.log(`   Login with: ${email} / ${password}`);

  // ── Questions ──────────────────────────────────────────────────────────────
  const questions = [
    {
      text: 'What is the capital of France?',
      options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
      correctIndex: 2,
      timerSeconds: 15,
      status: 'CLOSED' as const,
      liveDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      text: 'Which planet is known as the Red Planet?',
      options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
      correctIndex: 1,
      timerSeconds: 20,
      status: 'CLOSED' as const,
      liveDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      text: 'What is 12 × 12?',
      options: ['132', '144', '156', '124'],
      correctIndex: 1,
      timerSeconds: 10,
      status: 'CLOSED' as const,
      liveDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // yesterday
    },
    {
      text: 'Who wrote "Romeo and Juliet"?',
      options: ['Charles Dickens', 'Jane Austen', 'William Shakespeare', 'Mark Twain'],
      correctIndex: 2,
      timerSeconds: 20,
      status: 'LIVE' as const,
      liveDate: new Date(),
    },
    {
      text: 'What is the chemical symbol for Gold?',
      options: ['Go', 'Gd', 'Au', 'Ag'],
      correctIndex: 2,
      timerSeconds: 15,
      status: 'DRAFT' as const,
      liveDate: null,
    },
    {
      text: 'In which year did World War II end?',
      options: ['1943', '1944', '1945', '1946'],
      correctIndex: 2,
      timerSeconds: 25,
      status: 'DRAFT' as const,
      liveDate: null,
    },
  ];

  const created = [];
  for (const q of questions) {
    const existing = await prisma.question.findFirst({ where: { text: q.text } });
    if (existing) {
      created.push(existing);
      console.log(`⏭️  Skipped (exists): "${q.text.slice(0, 40)}"`);
      continue;
    }
    const newQ = await prisma.question.create({ data: q });
    created.push(newQ);
    console.log(`✅ Question created: "${q.text.slice(0, 40)}" [${q.status}]`);
  }

  // ── Fake Attempts for CLOSED questions ────────────────────────────────────
  const closedQuestions = created.filter((_, i) => questions[i].status === 'CLOSED');
  const nicknames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack'];
  const results = ['CORRECT', 'CORRECT', 'CORRECT', 'WRONG', 'WRONG', 'TIMEOUT'] as const;

  let attemptCount = 0;
  for (const q of closedQuestions) {
    const existingAttempts = await prisma.attempt.count({ where: { questionId: q.id } });
    if (existingAttempts > 0) {
      console.log(`⏭️  Skipped attempts for: "${q.text.slice(0, 40)}"`);
      continue;
    }
    for (let i = 0; i < nicknames.length; i++) {
      const result = results[i % results.length];
      await prisma.attempt.create({
        data: {
          questionId: q.id,
          anonId: `fake-anon-${q.id.slice(0, 8)}-${i}`,
          nickname: nicknames[i],
          selectedOption: result === 'TIMEOUT' ? null : (result === 'CORRECT' ? q.correctIndex : (q.correctIndex + 1) % 4),
          result,
          timeTakenMs: result === 'TIMEOUT' ? null : Math.floor(Math.random() * 8000) + 2000,
        },
      });
      attemptCount++;
    }
    console.log(`✅ Seeded ${nicknames.length} attempts for: "${q.text.slice(0, 40)}"`);
  }

  console.log(`\n🎉 Seed complete! ${created.length} questions, ${attemptCount} attempts.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
