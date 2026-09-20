import prisma from '../lib/prisma';

export async function executeQuestionLaunch(questionId: string, adminId: string) {
  // Atomic transaction:
  // (a) Find currently active PollLaunch (closedAt = null), set closedAt = now() & parent Question status to CLOSED
  // (b) Create new PollLaunch row for target question with launchedById = adminId
  // (c) Set target Question's status to LIVE
  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();

    // Find active PollLaunch if one exists
    const activeLaunch = await tx.pollLaunch.findFirst({
      where: { closedAt: null },
    });

    if (activeLaunch) {
      await tx.pollLaunch.update({
        where: { id: activeLaunch.id },
        data: { closedAt: now },
      });
      await tx.question.update({
        where: { id: activeLaunch.questionId },
        data: { status: 'CLOSED' },
      });
    }

    // Close any other questions marked LIVE or SCHEDULED (wait, should we close SCHEDULED? No, only LIVE)
    // Actually, only close LIVE questions.
    await tx.question.updateMany({
      where: { status: 'LIVE' },
      data: { status: 'CLOSED' },
    });

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
