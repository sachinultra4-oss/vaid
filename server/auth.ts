import crypto from 'node:crypto';
import type { AdminRole, AdminUserPublic, AdminUserRecord } from '../src/types/clinic.ts';

const RUNTIME_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12-hour session expiry
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

interface LoginBucket {
  failures: number;
  resetAt: number;
}

interface ResetCodeEntry {
  email: string;
  code: string;
  expiresAt: number;
}

interface PendingTwoStepEntry {
  userId: string;
  code: string;
  expiresAt: number;
}

const loginBuckets = new Map<string, LoginBucket>();
const resetCodes = new Map<string, ResetCodeEntry>();
const pendingTwoSteps = new Map<string, PendingTwoStepEntry>();

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

export function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parts = storedHash.split(':');
    if (parts.length !== 2) {
      resolve(false);
      return;
    }
    const [salt, keyHex] = parts;
    const keyBuf = Buffer.from(keyHex, 'hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err || derivedKey.length !== keyBuf.length) {
        resolve(false);
        return;
      }
      resolve(crypto.timingSafeEqual(keyBuf, derivedKey));
    });
  });
}

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  role: AdminRole;
  iat: number;
  exp: number;
}

export function issueSessionToken(user: AdminUserRecord): { token: string; exp: number } {
  const now = Date.now();
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', RUNTIME_SECRET).update(body).digest('base64url');
  return { token: `${body}.${sig}`, exp: payload.exp };
}

export function verifySessionToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', RUNTIME_SECRET)
      .update(body)
      .digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (!payload || typeof payload.exp !== 'number' || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function sanitizeAdminUser(u: AdminUserRecord): AdminUserPublic {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    two_step_enabled: u.two_step_enabled,
    created_at: u.created_at,
    last_login_at: u.last_login_at,
  };
}

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = loginBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    return { allowed: true, retryAfterSec: 0 };
  }
  if (bucket.failures >= MAX_LOGIN_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const existing = loginBuckets.get(key);
  if (!existing || now > existing.resetAt) {
    loginBuckets.set(key, { failures: 1, resetAt: now + LOCK_WINDOW_MS });
  } else {
    existing.failures += 1;
  }
}

export function clearLoginFailures(key: string): void {
  loginBuckets.delete(key);
}

export function createResetCode(email: string): string {
  const code = String(crypto.randomInt(100000, 999999));
  resetCodes.set(email.toLowerCase(), {
    email: email.toLowerCase(),
    code,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
  return code;
}

export function consumeResetCode(email: string, code: string): boolean {
  const key = email.toLowerCase();
  const entry = resetCodes.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    resetCodes.delete(key);
    return false;
  }
  const a = Buffer.from(entry.code);
  const b = Buffer.from(code.trim());
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return false;
  }
  resetCodes.delete(key);
  return true;
}

export function createTwoStepChallenge(userId: string): { challengeId: string; code: string } {
  const challengeId = crypto.randomUUID();
  const code = String(crypto.randomInt(100000, 999999));
  pendingTwoSteps.set(challengeId, {
    userId,
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  return { challengeId, code };
}

export function verifyTwoStepChallenge(challengeId: string, code: string): string | null {
  const entry = pendingTwoSteps.get(challengeId);
  if (!entry || Date.now() > entry.expiresAt) {
    pendingTwoSteps.delete(challengeId);
    return null;
  }
  const a = Buffer.from(entry.code);
  const b = Buffer.from(code.trim());
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  pendingTwoSteps.delete(challengeId);
  return entry.userId;
}
