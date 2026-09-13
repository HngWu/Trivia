/**
 * @jest-environment node
 */
import { redis } from '../src/lib/redis';
import {
  createRoom,
  joinRoom,
  updateRoomStatus,
  submitWager,
  submitAnswer,
  getRoomState,
  getRoomSync,
  touchRoomSync,
} from '../src/lib/actions';
import { gameStore } from '../src/lib/game-store';
import { resetSqliteDbForTesting, closeSqliteDb } from '../src/lib/db/sqlite-connection';

jest.mock('../src/lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    hset: jest.fn(),
    hget: jest.fn(),
    hdel: jest.fn(),
    expire: jest.fn(),
    hgetall: jest.fn(),
  },
  ROOM_TTL: 86400,
  isRedisConfigured: true,
}));

jest.mock('../src/lib/db', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    getQuestionsForTopic: jest.fn().mockResolvedValue([
      {
        id: 'q-1',
        topic: 'geography',
        summary: 'French Capital',
        text: 'What is the capital of France?',
        type: 'text',
        options: null,
        correct_answer: 'Paris',
        explanation: 'Paris is the capital.',
      },
      {
        id: 'q-2',
        topic: 'geography',
        summary: 'Japanese Capital',
        text: 'What is the capital of Japan?',
        type: 'text',
        options: null,
        correct_answer: 'Tokyo',
        explanation: 'Tokyo is the capital.',
      },
    ]),
  }),
  getActiveProviderNameSync: jest.fn().mockReturnValue('sqlite'),
  getActiveProviderName: jest.fn().mockResolvedValue('sqlite'),
}));

jest.mock('../src/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({}),
}));

describe('Buttons and transitions in Redis fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSqliteDbForTesting();
    gameStore.resetMemoryStoreForTesting();
    const redisError = () => Promise.reject(new Error('ECONNREFUSED'));
    (redis.get as jest.Mock).mockImplementation(redisError);
    (redis.set as jest.Mock).mockImplementation(redisError);
    (redis.hset as jest.Mock).mockImplementation(redisError);
    (redis.hget as jest.Mock).mockImplementation(redisError);
    (redis.hdel as jest.Mock).mockImplementation(redisError);
    (redis.hgetall as jest.Mock).mockImplementation(redisError);
    (redis.expire as jest.Mock).mockImplementation(redisError);
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('runs the full leader force-advance buttons sequence without Redis', async () => {
    // 1. Create room with Alice
    const { room, player: alice } = await createRoom('geography', 'Alice');
    const { player: bob } = await joinRoom(room.code, 'Bob');

    // Start game -> wager
    await updateRoomStatus(room.code, 'wager', 0);

    // Alice wagers 5. Bob has NOT wagered.
    await submitWager(room.code, alice.id, 'q-1', 5);
    const afterAliceWager = await getRoomState(room.code);
    expect(afterAliceWager.room?.status).toBe('wager');

    // Leader clicks "Reveal Question" (force advance to question)
    const afterRevealQuestion = await updateRoomStatus(room.code, 'question', 0);
    expect(afterRevealQuestion.room?.status).toBe('question');
    // Bob should have an auto-filled wager
    const bobAns = afterRevealQuestion.allAnswers.find(a => a.player_id === bob.id && a.question_id === 'q-1');
    expect(bobAns).toBeDefined();
    expect(bobAns?.wager).toBe(1);

    // Alice answers. Bob has NOT answered.
    await submitAnswer(room.code, alice.id, 'q-1', 'Paris');
    const afterAliceAns = await getRoomState(room.code);
    expect(afterAliceAns.room?.status).toBe('question');

    // Leader clicks "Reveal Answer" (force advance to results)
    const afterRevealAnswer = await updateRoomStatus(room.code, 'results', 0);
    expect(afterRevealAnswer.room?.status).toBe('results');

    // Leader clicks "Next Round" (advance to wager for round 2)
    const afterNextRound = await updateRoomStatus(room.code, 'wager', 1);
    expect(afterNextRound.room?.status).toBe('wager');
    expect(afterNextRound.room?.current_question_index).toBe(1);
  });
});
