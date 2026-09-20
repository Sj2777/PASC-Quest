import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface StudentPayload {
  studentId: string;
  nickname: string;
}

/**
 * Authenticates a student via the student_token httpOnly cookie.
 * Fails closed: returns 401 with { error: 'not_authenticated' } if token is missing or invalid.
 */
export function studentAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.student_token;
  if (!token) {
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }

  try {
    const secret = process.env.STUDENT_JWT_SECRET!;
    const payload = jwt.verify(token, secret) as StudentPayload;
    (req as any).studentId = payload.studentId;
    (req as any).studentNickname = payload.nickname;
    next();
  } catch {
    res.status(401).json({ error: 'not_authenticated' });
  }
}

/**
 * Optional student auth: extracts studentId and studentNickname if student_token cookie is valid,
 * but allows unauthenticated access if missing or invalid. Useful for public routes like leaderboards
 * where logged-in students want isMe identified without blocking logged-out students.
 */
export function optionalStudentAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.student_token;
  if (token) {
    try {
      const secret = process.env.STUDENT_JWT_SECRET!;
      const payload = jwt.verify(token, secret) as StudentPayload;
      (req as any).studentId = payload.studentId;
      (req as any).studentNickname = payload.nickname;
    } catch {
      // Ignore invalid or expired token on optional paths
    }
  }
  next();
}
