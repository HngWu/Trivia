/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';
import { getSqliteDb, closeSqliteDb, setDbPathOverride } from '@/lib/db/sqlite-connection';

describe('Real SQLite Database on Disk', () => {
  const realDbPath = path.join(process.cwd(), 'data', 'trivia.db');

  beforeAll(() => {
    // Point to the real database path
    setDbPathOverride(realDbPath);
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('creates and seeds data/trivia.db on disk', () => {
    const db = getSqliteDb();
    expect(fs.existsSync(realDbPath)).toBe(true);

    const topicsCount = (db.prepare('SELECT count(*) as count FROM topics').get() as { count: number }).count;
    expect(topicsCount).toBeGreaterThanOrEqual(10);

    const questionsCount = (db.prepare('SELECT count(*) as count FROM questions').get() as { count: number }).count;
    expect(questionsCount).toBeGreaterThanOrEqual(10);

    const admin = db.prepare("SELECT email FROM users WHERE email = 'admin@trivia.local'").get() as { email: string } | undefined;
    expect(admin?.email).toBe('admin@trivia.local');

    const providerSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'db_provider'").get() as { value: string } | undefined;
    expect(providerSetting?.value).toBe('sqlite');
  });
});
