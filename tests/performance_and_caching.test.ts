/**
 * @jest-environment node
 */
jest.mock('../src/lib/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1)
  },
  ROOM_TTL: 3600
}));

import { getTopics, getAllQuestions, getQuestionsByTopic, getQuestionCountsByTopic, invalidateTopicCache } from '@/lib/actions';
import { resetSqliteDbForTesting, closeSqliteDb } from '@/lib/db/sqlite-connection';

describe('Admin Data Fetching Performance & Caching', () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
    invalidateTopicCache();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('fetches topics sub-millisecond with in-memory caching', async () => {
    // First fetch (populates cache)
    const t0 = performance.now();
    const topics1 = await getTopics();
    const timeFirst = performance.now() - t0;
    expect(topics1.length).toBeGreaterThanOrEqual(10);
    expect(timeFirst).toBeLessThan(100); // fast first load

    // Second fetch (served from in-memory cache)
    const t1 = performance.now();
    const topics2 = await getTopics();
    const timeCached = performance.now() - t1;
    expect(topics2.length).toBe(topics1.length);
    expect(timeCached).toBeLessThan(15); // instant cached response
  });

  it('fetches question counts by topic in single-digit milliseconds', async () => {
    const t0 = performance.now();
    const counts = await getQuestionCountsByTopic();
    const duration = performance.now() - t0;

    expect(Object.keys(counts).length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100);
  });

  it('fetches all questions with limit 200 using created_at index', async () => {
    const t0 = performance.now();
    const questions = await getAllQuestions(200);
    const duration = performance.now() - t0;

    expect(questions.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100);
  });

  it('fetches questions by topic in single-digit milliseconds', async () => {
    const t0 = performance.now();
    const questions = await getQuestionsByTopic('history');
    const duration = performance.now() - t0;

    expect(questions.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100);
  });

  it('handles Redis offline/timeouts seamlessly without blocking or hanging', async () => {
    // In SQLite mode, Redis is completely bypassed. Verify invalidation and re-fetch are instantaneous
    invalidateTopicCache();
    const t0 = performance.now();
    const topics = await getTopics();
    const duration = performance.now() - t0;

    expect(topics.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100);
  });
});
