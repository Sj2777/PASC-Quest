import prisma from '../lib/prisma';

// Phase 7A: A question's active window is 24 hours from its launchedAt timestamp.
// Multiple questions may be LIVE simultaneously.
// Launching Q2 must NOT close Q1.
export const LAUNCH_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours in ms

/**
 * Returns true if a PollLaunch is within its 24-hour active window.
 * Does NOT check closedAt — callers must check that separately.
 */
export function isLaunchWithinWindow(launch: { launchedAt: Date }): boolean {
  return Date.now() < launch.launchedAt.getTime() + LAUNCH_LIFETIME_MS;
}

/**
 * Launch a question. Creates a new PollLaunch and marks the Question LIVE.
 * Does NOT close any other currently LIVE questions.
 */
export async function executeQuestionLaunch(questionId: string, adminId: string) {
  const result = await prisma.$transaction(async (tx) => {
    // Create the new launch
    const newLaunch = await tx.pollLaunch.create({
      data: {
        questionId,
        launchedById: adminId,
      },
    });

    // Set the target question to LIVE, clear scheduledAt since it's launched
    await tx.question.update({
      where: { id: questionId },
      data: {
        status: 'LIVE',
        scheduledAt: null,
      },
    });

    return newLaunch;
  });

  return result;
}

/**
 * Manually close a specific PollLaunch by ID.
 * Only closes the specified launch; does not affect other launches.
 * Returns the updated launch, or null if not found.
 * Idempotent: closing an already-closed launch is a no-op that returns the launch.
 */
export async function closePollLaunch(launchId: string) {
  const launch = await prisma.pollLaunch.findUnique({
    where: { id: launchId },
  });
  if (!launch) return null;

  // Already closed — return current state (idempotent)
  if (launch.closedAt !== null) return launch;

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const closedLaunch = await tx.pollLaunch.update({
      where: { id: launchId },
      data: { closedAt: now },
    });

    // Check if this question has any remaining open launches.
    // If not, mark the question CLOSED. If others are still open, leave it LIVE.
    const remainingOpenLaunches = await tx.pollLaunch.count({
      where: {
        questionId: launch.questionId,
        closedAt: null,
        id: { not: launchId },
      },
    });

    if (remainingOpenLaunches === 0) {
      await tx.question.update({
        where: { id: launch.questionId },
        data: { status: 'CLOSED' },
      });
    }

    return closedLaunch;
  });

  return updated;
}
