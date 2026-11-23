import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { isDatabaseConnectionError, isPostgresConfigured } from '../db/pool.ts';
import { getStore } from '../db/store.ts';
import type { StaffPermissions, User, UserRole } from '../../src/types/sams.ts';

export const SESSION_COOKIE_NAME = 'baust_sams_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

const FALLBACK_SESSION_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || FALLBACK_SESSION_SECRET;
}

interface SessionPayload {
  uid: string;
  exp: number;
}

export function createSessionToken(userId: string): string {
  const payload: SessionPayload = {
    uid: userId,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as SessionPayload;
    if (!parsed.uid || typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string): void {
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; Secure; SameSite=None; Partitioned`
  );
}

export function clearSessionCookie(res: Response): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned`
  );
}

export interface AuthRequest extends Request {
  authUser?: User;
}

export function verifyCsrfOrigin(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }

  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.headers.host;
  const hasCustomHeader = req.headers['x-requested-with'] === 'BAUST-SAMS';

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host || hasCustomHeader) {
        next();
        return;
      }
      res.status(403).json({ error: 'Invalid request origin.' });
      return;
    } catch {
      res.status(403).json({ error: 'Malformed Origin header.' });
      return;
    }
  }

  if (hasCustomHeader) {
    next();
    return;
  }

  // Allow same-origin requests without Origin header only when X-Requested-With is provided
  res.status(403).json({ error: 'Missing CSRF verification header.' });
}

export async function attachOptionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  if (!isPostgresConfigured()) {
    next();
    return;
  }
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
    const payload = verifySessionToken(rawToken);
    if (payload) {
      const user = await getStore().getUserById(payload.uid);
      if (user && user.isActive) {
        const { passwordHash: _omit, ...safeUser } = user;
        req.authUser = safeUser;
      }
    }
  } catch {
    // Ignore optional auth lookup failures
  }
  next();
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!isPostgresConfigured()) {
    res.status(503).json({
      error: 'PostgreSQL is not configured. Authenticated workflows and database writes are disabled.',
    });
    return;
  }

  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
  const payload = verifySessionToken(rawToken);
  if (!payload) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  try {
    const user = await getStore().getUserById(payload.uid);
    if (!user || !user.isActive) {
      clearSessionCookie(res);
      res.status(401).json({ error: 'Session is no longer valid or account is inactive.' });
      return;
    }

    const { passwordHash: _omit, ...safeUser } = user;
    req.authUser = safeUser;
    next();
  } catch (err) {
    if (isDatabaseConnectionError(err)) {
      res.status(503).json({ error: 'Database connection unavailable. Please try again shortly.' });
      return;
    }
    res.status(500).json({ error: 'Failed to verify user session.' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.authUser.role)) {
      res.status(403).json({ error: 'You do not have permission to access this resource.' });
      return;
    }
    next();
  };
}

export function hasStaffPermission(user: User, permission: keyof StaffPermissions): boolean {
  if (user.role !== 'staff' && user.role !== 'admin') return false;
  return Boolean(user.permissions?.[permission]);
}
