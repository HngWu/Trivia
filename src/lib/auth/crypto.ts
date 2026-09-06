import crypto from 'node:crypto';

const ITERATIONS = 100000;
const KEY_LEN = 32;
const DIGEST = 'sha256';

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const calculated = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
}

export function createSessionToken(userId: string, secret: string, maxAgeSeconds: number = 7 * 24 * 3600): string {
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  const payload = `${userId}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

export function verifySessionToken(token: string, secret: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [userId, expiresAtStr, signature] = decoded.split(':');
    if (!userId || !expiresAtStr || !signature) return null;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return null;

    const expectedSignature = crypto.createHmac('sha256', secret).update(`${userId}:${expiresAtStr}`).digest('hex');
    const isValid = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));

    return isValid ? userId : null;
  } catch {
    return null;
  }
}
