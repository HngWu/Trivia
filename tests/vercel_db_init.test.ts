/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getSqliteDb, closeSqliteDb, setDbPathOverride } from '@/lib/db/sqlite-connection';

describe('Vercel DB auto-initialization', () => {
  const tmpDir = path.join(os.tmpdir(), 'trivia-vercel-test-' + Date.now());
  const tmpDbPath = path.join(tmpDir, 'trivia.db');

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    setDbPathOverride(tmpDbPath);
  });

  afterAll(() => {
    closeSqliteDb();
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup errors
    }
  });

  it('automatically creates schema and seeds topics and questions on fresh cold start', () => {
    expect(fs.existsSync(tmpDbPath)).toBe(false);

    const db = getSqliteDb();
    expect(fs.existsSync(tmpDbPath)).toBe(true);

    const topicsCount = (db.prepare('SELECT count(*) as count FROM topics').get() as { count: number }).count;
    expect(topicsCount).toBe(12);

    const questionsCount = (db.prepare('SELECT count(*) as count FROM questions').get() as { count: number }).count;
    expect(questionsCount).toBe(1072);

    const expectedEmail = (process.env.ADMIN_EMAIL || 'admin@trivia.local').replace(/^["']|["']$/g, '').trim().toLowerCase();
    const admin = db.prepare("SELECT email FROM users WHERE lower(email) = ?").get(expectedEmail) as { email: string } | undefined;
    expect(admin?.email.toLowerCase()).toBe(expectedEmail);

    const providerSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'db_provider'").get() as { value: string } | undefined;
    expect(providerSetting?.value).toBe('sqlite');
  });
});
