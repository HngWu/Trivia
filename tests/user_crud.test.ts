/**
 * @jest-environment node
 */
import { resetSqliteDbForTesting, closeSqliteDb, getSqliteDb } from '@/lib/db/sqlite-connection';
import { getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser } from '@/lib/auth/actions';

// Mock cookies for getAdminSession
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn().mockReturnValue({ value: 'mock-session-token' }),
    set: jest.fn(),
    delete: jest.fn()
  })
}));

jest.mock('../src/lib/auth/crypto', () => {
  const actual = jest.requireActual('../src/lib/auth/crypto');
  return {
    ...actual,
    verifySessionToken: jest.fn()
  };
});

import { verifySessionToken } from '@/lib/auth/crypto';

describe('Admin Users CRUD Actions', () => {
  let adminId: string;

  beforeEach(() => {
    resetSqliteDbForTesting();
    const db = getSqliteDb();
    const expectedEmail = (process.env.ADMIN_EMAIL || 'admin@trivia.local').replace(/^["']|["']$/g, '').trim().toLowerCase();
    const user = db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(expectedEmail) as { id: string };
    adminId = user.id;
    (verifySessionToken as jest.Mock).mockReturnValue(adminId);
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('lists existing users', async () => {
    const expectedEmail = (process.env.ADMIN_EMAIL || 'admin@trivia.local').replace(/^["']|["']$/g, '').trim().toLowerCase();
    const users = await getAdminUsers();
    expect(users.length).toBeGreaterThanOrEqual(1);
    expect(users.some(u => u.email.toLowerCase() === expectedEmail)).toBe(true);
  });

  it('creates, updates, and deletes a user', async () => {
    const created = await createAdminUser({
      email: 'newadmin@trivia.local',
      password: 'password123'
    });
    expect(created.success).toBe(true);

    let users = await getAdminUsers();
    const newUser = users.find(u => u.email === 'newadmin@trivia.local');
    expect(newUser).toBeDefined();

    const updated = await updateAdminUser({
      id: newUser!.id,
      email: 'updatedadmin@trivia.local',
      password: 'newpassword123'
    });
    expect(updated.success).toBe(true);

    users = await getAdminUsers();
    expect(users.find(u => u.email === 'updatedadmin@trivia.local')).toBeDefined();

    const deleted = await deleteAdminUser(newUser!.id);
    expect(deleted.success).toBe(true);

    users = await getAdminUsers();
    expect(users.find(u => u.email === 'updatedadmin@trivia.local')).toBeUndefined();
  });

  it('prevents deleting own account', async () => {
    const res = await deleteAdminUser(adminId);
    expect(res.success).toBe(false);
    expect(res.error).toContain('own account');
  });

  it('returns plain objects with Object.prototype for RSC serialization', async () => {
    const users = await getAdminUsers();
    expect(users.length).toBeGreaterThan(0);
    expect(Object.getPrototypeOf(users[0])).toBe(Object.prototype);

    const created = await createAdminUser({
      email: 'prototypecheck@trivia.local',
      password: 'password123'
    });
    expect(created.success).toBe(true);
    expect(created.user).toBeDefined();
    expect(Object.getPrototypeOf(created.user)).toBe(Object.prototype);
  });
});
