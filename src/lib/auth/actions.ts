'use server';

import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { getSqliteDb } from '../db/sqlite-connection';
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from './crypto';

const COOKIE_NAME = 'trivia_admin_session';

let cachedSessionSecret: string | null = null;

function getSessionSecret(): string {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  if (cachedSessionSecret) return cachedSessionSecret;

  const db = getSqliteDb();
  const row = db.prepare("SELECT value FROM system_settings WHERE key = 'session_secret'").get() as { value: string } | undefined;
  if (row) {
    cachedSessionSecret = row.value;
    return row.value;
  }

  const generated = crypto.randomBytes(32).toString('hex');
  db.prepare("INSERT INTO system_settings (key, value) VALUES ('session_secret', ?)").run(generated);
  cachedSessionSecret = generated;
  return generated;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
}

export async function adminLogin(formData: { email: string; password: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    const db = getSqliteDb();
    const user = db.prepare('SELECT id, email, password_hash, salt FROM users WHERE lower(email) = ?').get(email) as UserRow | undefined;

    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const secret = getSessionSecret();
    const token = createSessionToken(user.id, secret);

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    });

    return { success: true };
  } catch (error) {
    const err = error as Error;
    return { success: false, error: err.message || 'Login failed.' };
  }
}

export async function adminLogout(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return { success: true };
}

export async function getAdminSession(): Promise<{ id: string; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const secret = getSessionSecret();
    const userId = verifySessionToken(token, secret);
    if (!userId) return null;

    const db = getSqliteDb();
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId) as { id: string; email: string } | undefined;
    if (!user) return null;

    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

export async function changeAdminPassword(data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized.' };

  if (!data.newPassword || data.newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters.' };
  }

  const db = getSqliteDb();
  const user = db.prepare('SELECT id, password_hash, salt FROM users WHERE id = ?').get(session.id) as UserRow | undefined;
  if (!user) return { success: false, error: 'User not found.' };

  const isCurrentValid = verifyPassword(data.currentPassword, user.password_hash, user.salt);
  if (!isCurrentValid) {
    return { success: false, error: 'Current password does not match.' };
  }

  const { hash, salt } = hashPassword(data.newPassword);
  db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, session.id);

  return { success: true };
}

export interface AdminUserView {
  id: string;
  email: string;
  created_at: string;
}

export async function getAdminUsers(): Promise<AdminUserView[]> {
  const session = await getAdminSession();
  if (!session) throw new Error('Unauthorized');

  const db = getSqliteDb();
  const rows = db.prepare('SELECT id, email, created_at FROM users ORDER BY created_at ASC').all() as Array<{
    id: string;
    email: string;
    created_at: string;
  }>;
  return rows.map(r => ({
    id: String(r.id),
    email: String(r.email),
    created_at: String(r.created_at)
  }));
}

export async function createAdminUser(data: { email: string; password: string }): Promise<{ success: boolean; user?: AdminUserView; error?: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const email = data.email.trim().toLowerCase();
  if (!email || !data.password) {
    return { success: false, error: 'Email and password are required' };
  }
  if (data.password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  const db = getSqliteDb();
  const existing = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(email);
  if (existing) {
    return { success: false, error: 'User with this email already exists' };
  }

  const id = crypto.randomUUID();
  const { hash, salt } = hashPassword(data.password);
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt)
    VALUES (?, ?, ?, ?)
  `).run(id, email, hash, salt);

  const user = db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(id) as { id: string; email: string; created_at: string } | undefined;
  return {
    success: true,
    user: user ? {
      id: String(user.id),
      email: String(user.email),
      created_at: String(user.created_at)
    } : undefined
  };
}

export async function updateAdminUser(data: { id: string; email?: string; password?: string }): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  const db = getSqliteDb();
  const user = db.prepare('SELECT id, email, password_hash, salt FROM users WHERE id = ?').get(data.id) as UserRow | undefined;
  if (!user) return { success: false, error: 'User not found' };

  if (data.email) {
    const newEmail = data.email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE lower(email) = ? AND id != ?').get(newEmail, data.id);
    if (existing) {
      return { success: false, error: 'Email is already in use by another user' };
    }
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(newEmail, data.id);
  }

  if (data.password) {
    if (data.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }
    const { hash, salt } = hashPassword(data.password);
    db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, data.id);
  }

  return { success: true };
}

export async function deleteAdminUser(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await getAdminSession();
  if (!session) return { success: false, error: 'Unauthorized' };

  if (session.id === id) {
    return { success: false, error: 'Cannot delete your own account' };
  }

  const db = getSqliteDb();
  const count = (db.prepare('SELECT count(*) as count FROM users').get() as { count: number }).count;
  if (count <= 1) {
    return { success: false, error: 'Cannot delete the only remaining admin account' };
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return { success: true };
}

