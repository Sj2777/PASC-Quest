import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const ANON_COOKIE = 'anon_id';
const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Ensures every student request has an anon_id cookie.
 * Sets it if missing and attaches it to req as req.anonId.
 */
export function ensureAnonId(req: Request, res: Response, next: NextFunction): void {
  let anonId = req.cookies?.[ANON_COOKIE];
  if (!anonId) {
    anonId = uuidv4();
    res.cookie(ANON_COOKIE, anonId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_MS,
    });
  }
  (req as any).anonId = anonId;
  next();
}
