/**
 * @jest-environment node
 */
import { SqliteDatabaseProvider } from '@/lib/db/sqlite';
import { resetSqliteDbForTesting, closeSqliteDb } from '@/lib/db/sqlite-connection';
import { Topic, Question } from '@/lib/types/game';

describe('SqliteDatabaseProvider', () => {
  let provider: SqliteDatabaseProvider;

  beforeEach(() => {
    resetSqliteDbForTesting();
    provider = new SqliteDatabaseProvider();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('retrieves topics', async () => {
    const topics = await provider.getTopics();
    expect(topics.length).toBeGreaterThanOrEqual(10);
    expect(topics.some(t => t.id === 'history')).toBe(true);
  });

  it('adds, updates, and deletes a topic', async () => {
    const testTopic: Topic = {
      id: 'test-topic',
      name: 'Test Topic',
      icon: '🧪',
      description: 'Testing',
      example_question: 'Is this a test?'
    };

    await provider.addTopic(testTopic);
    let topics = await provider.getTopics();
    expect(topics.find(t => t.id === 'test-topic')?.name).toBe('Test Topic');

    await provider.updateTopic('test-topic', { name: 'Updated Topic' });
    topics = await provider.getTopics();
    expect(topics.find(t => t.id === 'test-topic')?.name).toBe('Updated Topic');

    await provider.deleteTopic('test-topic');
    topics = await provider.getTopics();
    expect(topics.find(t => t.id === 'test-topic')).toBeUndefined();
  });

  it('manages questions and handles duplicate detection', async () => {
    const questions: Question[] = [
      {
        id: '',
        topic: 'history',
        summary: 'Test Q',
        text: 'Unique Test Question 12345?',
        type: 'text',
        options: null,
        correct_answer: 'Yes',
        explanation: 'Test exp'
      }
    ];

    const res1 = await provider.addQuestions(questions);
    expect(res1.count).toBe(1);

    // Duplicate submission should be filtered
    const res2 = await provider.addQuestions(questions);
    expect(res2.count).toBe(0);

    const retrieved = await provider.getQuestionsByTopic('history');
    const match = retrieved.find(q => q.text === 'Unique Test Question 12345?');
    expect(match).toBeDefined();

    if (match) {
      await provider.updateQuestion(match.id, { correct_answer: 'Absolutely' });
      const updatedList = await provider.getQuestionsByTopic('history');
      expect(updatedList.find(q => q.id === match.id)?.correct_answer).toBe('Absolutely');

      await provider.deleteQuestion(match.id);
      const finalList = await provider.getQuestionsByTopic('history');
      expect(finalList.find(q => q.id === match.id)).toBeUndefined();
    }
  });

  it('retrieves random questions for topic', async () => {
    const questions = await provider.getQuestionsForTopic('history', 3);
    expect(questions.length).toBe(3);
    expect(questions.every(q => q.topic === 'history')).toBe(true);
  });

  it('ensures returned objects have Object.prototype (plain objects for RSC serialization)', async () => {
    const topics = await provider.getTopics();
    expect(topics.length).toBeGreaterThan(0);
    expect(Object.getPrototypeOf(topics[0])).toBe(Object.prototype);

    const questions = await provider.getQuestionsForTopic('history', 1);
    expect(questions.length).toBeGreaterThan(0);
    expect(Object.getPrototypeOf(questions[0])).toBe(Object.prototype);

    const questionsByTopic = await provider.getQuestionsByTopic('history');
    expect(questionsByTopic.length).toBeGreaterThan(0);
    expect(Object.getPrototypeOf(questionsByTopic[0])).toBe(Object.prototype);
  });
});
