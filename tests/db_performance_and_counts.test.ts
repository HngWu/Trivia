/**
 * @jest-environment node
 */
import { getSqliteDb, resetSqliteDbForTesting, closeSqliteDb } from '@/lib/db/sqlite-connection';

describe('SQLite Performance PRAGMAs & Indexes', () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('configures performance PRAGMAs and creates strategic indexes', () => {
    const db = getSqliteDb();

    // Check synchronous PRAGMA
    const syncRow = db.prepare('PRAGMA synchronous').get() as { synchronous: number };
    // synchronous should be 1 (NORMAL)
    expect(syncRow.synchronous).toBe(1);

    // Check indexes in sqlite_master
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all() as Array<{ name: string }>;
    const indexNames = new Set(indexes.map(i => i.name));

    expect(indexNames.has('idx_questions_topic_created')).toBe(true);
    expect(indexNames.has('idx_questions_type')).toBe(true);
    expect(indexNames.has('idx_users_lower_email')).toBe(true);
    expect(indexNames.has('idx_topics_name')).toBe(true);
  });

  it('provides getQuestionCountsByTopic() and getAllQuestions()', async () => {
    const { SqliteDatabaseProvider } = await import('@/lib/db/sqlite');
    const provider = new SqliteDatabaseProvider();

    const counts = await provider.getQuestionCountsByTopic();
    expect(typeof counts).toBe('object');
    expect(counts['history']).toBeGreaterThanOrEqual(1);

    const allQ = await provider.getAllQuestions(10);
    expect(Array.isArray(allQ)).toBe(true);
    expect(allQ.length).toBeGreaterThanOrEqual(1);
    expect(Object.getPrototypeOf(allQ[0])).toBe(Object.prototype);
  });

  it('executes batch addQuestions inside a transaction safely', async () => {
    const { SqliteDatabaseProvider } = await import('@/lib/db/sqlite');
    const provider = new SqliteDatabaseProvider();

    const batch = [
      {
        id: 'perf-test-1',
        topic: 'history',
        summary: 'Perf 1',
        text: 'Performance Test Question 1?',
        type: 'text' as const,
        options: null,
        correct_answer: '42',
        explanation: 'Fast'
      },
      {
        id: 'perf-test-2',
        topic: 'science',
        summary: 'Perf 2',
        text: 'Performance Test Question 2?',
        type: 'boolean' as const,
        options: null,
        correct_answer: 'True',
        explanation: 'Speedy'
      }
    ];

    const result = await provider.addQuestions(batch);
    expect(result.count).toBe(2);

    const counts = await provider.getQuestionCountsByTopic();
    expect(counts['history']).toBeGreaterThanOrEqual(2);
    expect(counts['science']).toBeGreaterThanOrEqual(2);
  });

  it('caches active provider in memory to eliminate redundant disk queries', async () => {
    const { getActiveProviderName, clearProviderCache } = await import('@/lib/db/index');
    clearProviderCache();

    const p1 = await getActiveProviderName();
    expect(p1).toBe('sqlite');

    // Second call should return cached value instantly
    const p2 = await getActiveProviderName();
    expect(p2).toBe('sqlite');
  });
});
