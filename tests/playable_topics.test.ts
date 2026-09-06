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

import { getPlayableTopics, invalidateTopicCache } from '@/lib/actions';
import { getDatabase } from '@/lib/db';
import { resetSqliteDbForTesting, closeSqliteDb } from '@/lib/db/sqlite-connection';
import { Question, Topic } from '@/lib/types/game';

describe('getPlayableTopics', () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
    invalidateTopicCache();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('filters out topics with fewer than 10 questions but keeps topics with >= 10 questions', async () => {
    const db = await getDatabase();
    
    // Add a low-count topic with only 3 questions
    const lowTopic: Topic = { id: 'low-topic', name: 'Low Topic', icon: '📉' };
    await db.addTopic(lowTopic);
    const lowQuestions: Question[] = [1, 2, 3].map(i => ({
      id: `low-q-${i}`,
      topic: 'low-topic',
      summary: `Summary ${i}`,
      text: `Question text ${i}?`,
      type: 'multiple_choice' as const,
      options: ['A', 'B', 'C', 'D'],
      correct_answer: 'A'
    }));
    await db.addQuestions(lowQuestions);

    // Add a high-count topic with 12 questions
    const highTopic: Topic = { id: 'high-topic', name: 'High Topic', icon: '📈' };
    await db.addTopic(highTopic);
    const highQuestions: Question[] = Array.from({ length: 12 }, (_, i) => ({
      id: `high-q-${i}`,
      topic: 'high-topic',
      summary: `High Summary ${i}`,
      text: `High Question text ${i}?`,
      type: 'multiple_choice' as const,
      options: ['A', 'B', 'C', 'D'],
      correct_answer: 'A'
    }));
    await db.addQuestions(highQuestions);

    const playable = await getPlayableTopics(10);
    const playableIds = playable.map(t => t.id.toLowerCase());

    expect(playableIds).toContain('high-topic');
    expect(playableIds).not.toContain('low-topic');
  });

  it('always includes the "custom" topic even if it has 0 database questions', async () => {
    const playable = await getPlayableTopics(10);
    const playableIds = playable.map(t => t.id.toLowerCase());

    expect(playableIds).toContain('custom');
  });

  it('handles case-insensitivity when matching topic ID against count map', async () => {
    const db = await getDatabase();
    await db.addTopic({ id: 'MixedCaseTopic', name: 'Mixed Case', icon: '🔤' });
    const questions: Question[] = Array.from({ length: 10 }, (_, i) => ({
      id: `mixed-q-${i}`,
      topic: 'MixedCaseTopic',
      summary: `Mixed Summary ${i}`,
      text: `Mixed Question text ${i}?`,
      type: 'multiple_choice' as const,
      options: ['A', 'B', 'C', 'D'],
      correct_answer: 'A'
    }));
    await db.addQuestions(questions);

    const playable = await getPlayableTopics(10);
    const match = playable.find(t => t.id.toLowerCase() === 'mixedcasetopic');
    expect(match).toBeDefined();
  });
});
