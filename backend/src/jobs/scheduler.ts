import cron from 'node-cron';
import prisma from '../lib/prisma';
import { executeQuestionLaunch, closePollLaunch, LAUNCH_LIFETIME_MS } from '../services/launchService';

export function startScheduler() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // ── 1. Auto-launch SCHEDULED questions whose scheduledAt has passed ──────
      // Multiple questions may become LIVE in the same run without closing each other.
      const scheduledQuestions = await prisma.question.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { lte: now },
        },
      });

      for (const question of scheduledQuestions) {
        console.log(`[Scheduler] Auto-launching scheduled question: ${question.id}`);
        await executeQuestionLaunch(question.id, question.createdById);
      }

      // ── 2. Expire LIVE launches that have exceeded their 24-hour window ───────
      // expiresAt = launchedAt + 24h. We find launches where:
      //   closedAt IS NULL  (still nominally open)
      //   launchedAt <= now - 24h  (window has elapsed)
      const expiryThreshold = new Date(now.getTime() - LAUNCH_LIFETIME_MS);

      const expiredLaunches = await prisma.pollLaunch.findMany({
        where: {
          closedAt: null,
          launchedAt: { lte: expiryThreshold },
        },
        select: { id: true },
      });

      for (const launch of expiredLaunches) {
        console.log(`[Scheduler] Expiring launch: ${launch.id}`);
        await closePollLaunch(launch.id);
      }
    } catch (error) {
      console.error('[Scheduler] Error processing scheduled questions:', error);
    }
  });
}
