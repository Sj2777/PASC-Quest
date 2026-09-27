import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { studentAuthMiddleware } from '../middleware/studentAuth';

const router = Router();

// POST /api/social/follow/:nickname
router.post('/follow/:nickname', studentAuthMiddleware, async (req: Request, res: Response) => {
  const followerId = (req as any).studentId as string;
  const targetNickname = req.params.nickname as string;

  try {
    const targetStudent = await prisma.student.findUnique({
      where: { nickname: targetNickname }
    });

    if (!targetStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (targetStudent.id === followerId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    await prisma.follow.create({
      data: {
        followerId,
        followedId: targetStudent.id
      }
    });

    res.json({ message: `Successfully followed ${targetNickname}` });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Already following this student' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/social/unfollow/:nickname
router.post('/unfollow/:nickname', studentAuthMiddleware, async (req: Request, res: Response) => {
  const followerId = (req as any).studentId as string;
  const targetNickname = req.params.nickname as string;

  try {
    const targetStudent = await prisma.student.findUnique({
      where: { nickname: targetNickname }
    });

    if (!targetStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await prisma.follow.deleteMany({
      where: {
        followerId,
        followedId: targetStudent.id
      }
    });

    res.json({ message: `Successfully unfollowed ${targetNickname}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/social/friends
router.get('/friends', studentAuthMiddleware, async (req: Request, res: Response) => {
  const followerId = (req as any).studentId as string;

  try {
    const follows = await prisma.follow.findMany({
      where: { followerId },
      include: {
        followed: {
          select: {
            id: true,
            nickname: true,
            currentStreak: true,
            bestStreak: true,
            branch: true
          }
        }
      }
    });

    const friends = follows.map(f => f.followed);
    res.json({ friends });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/social/follow-summary
router.get('/follow-summary', studentAuthMiddleware, async (req: Request, res: Response) => {
  const studentId = (req as any).studentId as string;

  try {
    const following = await prisma.follow.findMany({
      where: { followerId: studentId },
      include: {
        followed: {
          select: {
            id: true,
            nickname: true,
            currentStreak: true,
            bestStreak: true,
            branch: true
          }
        }
      }
    });

    const followers = await prisma.follow.findMany({
      where: { followedId: studentId },
      include: {
        follower: {
          select: {
            id: true,
            nickname: true,
            currentStreak: true,
            bestStreak: true,
            branch: true
          }
        }
      }
    });

    res.json({
      followingCount: following.length,
      followersCount: followers.length,
      following: following.map(f => f.followed),
      followers: followers.map(f => f.follower),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
