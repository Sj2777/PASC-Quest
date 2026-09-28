import bcrypt from 'bcrypt';
import { PrismaClient, AdminRole, QuestionStatus } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // ── Admins ──────────────────────────────────────────────────────────────────
  const superAdminEmail = process.env.ADMIN_EMAIL || 'admin@PASC Quest.dev';
  const envPassword = process.env.ADMIN_PASSWORD;
  
  if (!envPassword && process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PASSWORD must be explicitly provided in production environments to prevent default credentials.');
  }
  
  const adminPassword = envPassword || 'admin123';
  const superAdminPasswordHash = await bcrypt.hash(adminPassword, 12);

  const superAdmin = await prisma.admin.upsert({
    where: { email: superAdminEmail },
    update: {
      passwordHash: superAdminPasswordHash,
      role: AdminRole.SUPER_ADMIN,
    },
    create: {
      email: superAdminEmail,
      passwordHash: superAdminPasswordHash,
      role: AdminRole.SUPER_ADMIN,
    },
  });
  console.log(`✅ Super Admin seeded: ${superAdmin.email} [${superAdmin.role}]`);
  console.log(`   Login with: ${superAdminEmail} / ${adminPassword}`);

  if (process.env.NODE_ENV !== 'production') {
    const staffAdminEmail = 'staff@PASC Quest.dev';
  const staffAdminPasswordHash = await bcrypt.hash('admin123', 12);

  const staffAdmin = await prisma.admin.upsert({
    where: { email: staffAdminEmail },
    update: {
      passwordHash: staffAdminPasswordHash,
      role: AdminRole.ADMIN,
    },
    create: {
      email: staffAdminEmail,
      passwordHash: staffAdminPasswordHash,
      role: AdminRole.ADMIN,
    },
  });
  console.log(`✅ Admin seeded: ${staffAdmin.email} [${staffAdmin.role}]`);
  console.log(`   Login with: ${staffAdminEmail} / admin123`);

  // ── Sample Students ────────────────────────────────────────────────────────
  const sampleStudents = [
    { nickname: 'testplayer1', password: 'test123' },
    { nickname: 'testplayer2', password: 'test123' },
  ];

  for (const s of sampleStudents) {
    const passwordHash = await bcrypt.hash(s.password, 12);
    const student = await prisma.student.upsert({
      where: { nickname: s.nickname },
      update: { passwordHash },
      create: {
        nickname: s.nickname,
        passwordHash,
      },
    });
    console.log(`✅ Student seeded: ${student.nickname}`);
    console.log(`   Login with: ${s.nickname} / ${s.password}`);
  }

  // ── Sample Questions ────────────────────────────────────────────────────────
  // All sample questions start in DRAFT status with createdById referencing seeded admins.
  const sampleQuestions = [
    {
      text: 'What is the output of typeof null in JavaScript?',
      options: ['object', 'null', 'undefined', 'number'],
      correctIndex: 0,
      timerSeconds: 15,
      status: QuestionStatus.DRAFT,
      createdById: superAdmin.id,
    },
    {
      text: 'Which data structure operates on a Last In, First Out (LIFO) basis?',
      options: ['Queue', 'Stack', 'Linked List', 'Binary Tree'],
      correctIndex: 1,
      timerSeconds: 20,
      status: QuestionStatus.DRAFT,
      createdById: staffAdmin.id,
    },
    {
      text: 'What is the time complexity of searching an element in a balanced binary search tree?',
      options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
      correctIndex: 2,
      timerSeconds: 15,
      status: QuestionStatus.DRAFT,
      createdById: superAdmin.id,
    },
  ];

  const createdQuestions = [];
  for (const q of sampleQuestions) {
    const existing = await prisma.question.findFirst({ where: { text: q.text } });
    if (existing) {
      createdQuestions.push(existing);
      console.log(`⏭️  Skipped (exists): "${q.text.slice(0, 40)}"`);
      continue;
    }
    const newQ = await prisma.question.create({ data: q });
    createdQuestions.push(newQ);
    console.log(`✅ Question created: "${q.text.slice(0, 40)}" [${q.status}] (createdBy: ${q.createdById})`);
  }

    // PollLaunch, Follow, and Attempt rows are deliberately left empty.
    console.log(`\n🎉 Dev seed complete! ${createdQuestions.length} sample questions, 2 admins, 2 students seeded.`);
  } else {
    console.log(`\n🎉 Production seed complete! 1 super admin seeded.`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
