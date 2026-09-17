import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminPayload {
  adminId: string;
  email: string;
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.admin_token;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const secret = process.env.ADMIN_JWT_SECRET!;
    const payload = jwt.verify(token, secret) as AdminPayload;
    (req as any).admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}
