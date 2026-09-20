import cron from 'node-cron';
import prisma from '../lib/prisma';
import { executeQuestionLaunch } from '../services/launchService';

export function startScheduler() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      const scheduledQuestions = await prisma.question.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: {
            lte: now,
          },
        },
      });

      for (const question of scheduledQuestions) {
        console.log(`[Scheduler] Auto-launching scheduled question: ${question.id}`);
        await executeQuestionLaunch(question.id, question.createdById);
      }
    } catch (error) {
      console.error('[Scheduler] Error processing scheduled questions:', error);
    }
  });
}
