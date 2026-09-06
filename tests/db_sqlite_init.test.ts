/**
 * @jest-environment node
 */
import { getSqliteDb, closeSqliteDb, resetSqliteDbForTesting } from '@/lib/db/sqlite-connection';

describe('SQLite Database Initialization', () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('creates tables and sets WAL mode', () => {
    const db = getSqliteDb();
    expect(db).toBeDefined();

    // Verify tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('topics');
    expect(tableNames).toContain('questions');
    expect(tableNames).toContain('system_settings');
    expect(tableNames).toContain('users');
  });

  it('seeds default settings and default admin user if empty', () => {
    const db = getSqliteDb();
    const settings = db.prepare("SELECT value FROM system_settings WHERE key = 'db_provider'").get() as { value: string } | undefined;
    expect(settings?.value).toBe('sqlite');

    const adminUser = db.prepare("SELECT email FROM users WHERE email = 'admin@trivia.local'").get() as { email: string } | undefined;
    expect(adminUser?.email).toBe('admin@trivia.local');

    const topicsCount = db.prepare("SELECT count(*) as count FROM topics").get() as { count: number };
    expect(topicsCount.count).toBeGreaterThanOrEqual(10);
  });

  it('seeds default questions from questions_rows dataset (1072 questions)', async () => {
    const { DEFAULT_QUESTIONS } = await import('@/lib/db/seed-data');
    expect(DEFAULT_QUESTIONS.length).toBe(1072);

    const db = getSqliteDb();
    const questionsCount = db.prepare("SELECT count(*) as count FROM questions").get() as { count: number };
    expect(questionsCount.count).toBe(1072);
  });
});
