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

import { getTopics, addTopic, deleteTopic, invalidateTopicCache } from '@/lib/actions';
import { resetSqliteDbForTesting, closeSqliteDb } from '@/lib/db/sqlite-connection';

describe('Actions with Database Provider', () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
    invalidateTopicCache();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('fetches topics from active provider', async () => {
    const topics = await getTopics();
    expect(topics.length).toBeGreaterThanOrEqual(10);
  });

  it('creates and deletes a topic via actions', async () => {
    await addTopic({
      id: 'action-test-topic',
      name: 'Action Test Topic',
      icon: '🎯'
    });

    const topics = await getTopics();
    expect(topics.find(t => t.id === 'action-test-topic')).toBeDefined();

    await deleteTopic('action-test-topic');
    const updated = await getTopics();
    expect(updated.find(t => t.id === 'action-test-topic')).toBeUndefined();
  });
});
