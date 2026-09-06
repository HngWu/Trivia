/**
 * @jest-environment node
 */
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from '@/lib/auth/crypto';

describe('Local Authentication Crypto', () => {
  it('hashes and verifies passwords with salt', () => {
    const password = 'SecretPassword123!';
    const { hash, salt } = hashPassword(password);

    expect(hash).toBeDefined();
    expect(salt).toBeDefined();
    expect(verifyPassword(password, hash, salt)).toBe(true);
    expect(verifyPassword('WrongPassword', hash, salt)).toBe(false);
  });

  it('creates and verifies valid HMAC session tokens', () => {
    const secret = 'super-secret-key-for-test-32-chars!';
    const userId = 'user-123-uuid';
    const token = createSessionToken(userId, secret, 3600);

    const verified = verifySessionToken(token, secret);
    expect(verified).toBe(userId);
  });

  it('rejects tampered or expired tokens', () => {
    const secret = 'super-secret-key-for-test-32-chars!';
    const userId = 'user-123-uuid';
    const token = createSessionToken(userId, secret, -10); // expired

    expect(verifySessionToken(token, secret)).toBeNull();

    const validToken = createSessionToken(userId, secret, 3600);
    const tampered = validToken.slice(0, -4) + 'abcd';
    expect(verifySessionToken(tampered, secret)).toBeNull();
  });
});
