/**
 * @jest-environment node
 */
import { getSqliteDb, resetSqliteDbForTesting, closeSqliteDb } from '@/lib/db/sqlite-connection';
import { adminLogin } from '@/lib/auth/actions';

// Mock cookies for adminLogin
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn().mockReturnValue({ value: 'mock-session-token' }),
    set: jest.fn(),
    delete: jest.fn()
  })
}));

describe('Admin Environment Credentials Authentication', () => {
  const originalEnvPassword = process.env.ADMIN_PASSWORD;
  const originalEnvEmail = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    resetSqliteDbForTesting();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  afterEach(() => {
    process.env.ADMIN_PASSWORD = originalEnvPassword;
    process.env.ADMIN_EMAIL = originalEnvEmail;
  });

  it('authenticates admin user using configured ADMIN_PASSWORD', async () => {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@trivia.local').replace(/^["']|["']$/g, '').trim().toLowerCase();
    process.env.ADMIN_PASSWORD = 'custom_secret_password_456';

    // Re-initialize or sync sqlite db with new env password
    const db = getSqliteDb();
    const user = db.prepare("SELECT email FROM users WHERE lower(email) = ?").get(adminEmail) as { email: string };
    expect(user).toBeDefined();

    const result = await adminLogin({
      email: adminEmail,
      password: 'custom_secret_password_456'
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects incorrect password when ADMIN_PASSWORD is set', async () => {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@trivia.local').replace(/^["']|["']$/g, '').trim().toLowerCase();
    process.env.ADMIN_PASSWORD = 'custom_secret_password_456';

    const result = await adminLogin({
      email: adminEmail,
      password: 'wrong_password_attempt'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email or password.');
  });

  it('authenticates admin user using custom ADMIN_EMAIL and ADMIN_PASSWORD', async () => {
    process.env.ADMIN_EMAIL = 'superadmin@example.org';
    process.env.ADMIN_PASSWORD = 'super_secure_pass_789';

    const db = getSqliteDb();
    const user = db.prepare("SELECT email FROM users WHERE lower(email) = 'superadmin@example.org'").get() as { email: string };
    expect(user).toBeDefined();
    expect(user.email).toBe('superadmin@example.org');

    const result = await adminLogin({
      email: 'superadmin@example.org',
      password: 'super_secure_pass_789'
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
