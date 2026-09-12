/**
 * @jest-environment node
 */
import { redis } from '../src/lib/redis';
import {
  createRoom,
  joinRoom,
  getRoomState,
  updateRoomStatus,
  submitWager,
  submitAnswer,
  kickPlayer,
  getRoomSync,
  touchRoomSync,
} from '../src/lib/actions';
import { gameStore } from '../src/lib/game-store';
import { resetSqliteDbForTesting, closeSqliteDb } from '../src/lib/db/sqlite-connection';

// Mock Upstash Redis
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

// Mock Database provider for questions
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

// Mock Supabase server
jest.mock('../src/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({}),
}));

describe('Resilience Against Upstash Redis Failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSqliteDbForTesting();
    gameStore.resetMemoryStoreForTesting();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  describe('Complete Redis Outage from Start', () => {
    beforeEach(() => {
      // Configure all Redis methods to reject with connection failure
      const redisError = () => Promise.reject(new Error('ECONNREFUSED: Connection to Upstash Redis failed'));
      (redis.get as jest.Mock).mockImplementation(redisError);
      (redis.set as jest.Mock).mockImplementation(redisError);
      (redis.hset as jest.Mock).mockImplementation(redisError);
      (redis.hget as jest.Mock).mockImplementation(redisError);
      (redis.hdel as jest.Mock).mockImplementation(redisError);
      (redis.hgetall as jest.Mock).mockImplementation(redisError);
      (redis.expire as jest.Mock).mockImplementation(redisError);
    });

    it('creates a room successfully even when Redis fails', async () => {
      const { room, player } = await createRoom('geography', 'Alice');

      expect(room).toBeDefined();
      expect(room.code).toBeDefined();
      expect(room.status).toBe('waiting');
      expect(room.questions.length).toBe(2);
      expect(room.version).toBe(1);

      expect(player).toBeDefined();
      expect(player.name).toBe('Alice');
      expect(player.is_leader).toBe(true);
      expect(player.score).toBe(0);
    });

    it('allows players to join the room without Redis', async () => {
      const { room: createdRoom } = await createRoom('geography', 'Alice');
      const { room: joinedRoom, player: bob } = await joinRoom(createdRoom.code, 'Bob');

      expect(joinedRoom).toBeDefined();
      expect(joinedRoom.code).toBe(createdRoom.code);
      expect(bob.name).toBe('Bob');
      expect(bob.is_leader).toBe(false);

      const state = await getRoomState(createdRoom.code);
      expect(state.players.length).toBe(2);
      expect(state.players.map(p => p.name)).toEqual(expect.arrayContaining(['Alice', 'Bob']));
    });

    it('handles duplicate join gracefully without Redis', async () => {
      const { room } = await createRoom('geography', 'Alice');
      const { player: firstJoin } = await joinRoom(room.code, 'Bob');
      const { player: secondJoin } = await joinRoom(room.code, 'Bob');

      expect(firstJoin.id).toBe(secondJoin.id);

      const state = await getRoomState(room.code);
      expect(state.players.length).toBe(2);
    });

    it('retrieves full room state accurately from local fallback store', async () => {
      const { room, player: alice } = await createRoom('geography', 'Alice');
      await joinRoom(room.code, 'Bob');

      const state = await getRoomState(room.code);
      expect(state.room?.code).toBe(room.code);
      expect(state.room?.leader_id).toBe(alice.id);
      expect(state.players).toHaveLength(2);
      expect(state.allAnswers).toEqual([]);
    });

    it('handles wagers and transitions to question phase without Redis', async () => {
      const { room, player: alice } = await createRoom('geography', 'Alice');
      const { player: bob } = await joinRoom(room.code, 'Bob');

      // Start game (move to wager phase)
      await updateRoomStatus(room.code, 'wager', 0);

      // Alice submits wager 5
      const stateAfterAlice = await submitWager(room.code, alice.id, 'q-1', 5);
      expect(stateAfterAlice.room?.status).toBe('wager');

      // Bob submits wager 8 -> all players wagered -> auto transition to 'question'
      const stateAfterBob = await submitWager(room.code, bob.id, 'q-1', 8);
      expect(stateAfterBob.room?.status).toBe('question');
      expect(stateAfterBob.allAnswers).toHaveLength(2);
      expect(stateAfterBob.allAnswers.find(a => a.player_id === alice.id)?.wager).toBe(5);
      expect(stateAfterBob.allAnswers.find(a => a.player_id === bob.id)?.wager).toBe(8);
    });

    it('handles answers, scoring, and transitions to results phase without Redis', async () => {
      const { room, player: alice } = await createRoom('geography', 'Alice');
      const { player: bob } = await joinRoom(room.code, 'Bob');

      await updateRoomStatus(room.code, 'wager', 0);
      await submitWager(room.code, alice.id, 'q-1', 5);
      await submitWager(room.code, bob.id, 'q-1', 8);

      // Alice answers correctly ("Paris")
      const stateAfterAlice = await submitAnswer(room.code, alice.id, 'q-1', 'Paris');
      expect(stateAfterAlice.room?.status).toBe('question');

      // Bob answers incorrectly ("London") -> all answered -> auto transition to 'results'
      const stateAfterBob = await submitAnswer(room.code, bob.id, 'q-1', 'London');
      expect(stateAfterBob.room?.status).toBe('results');

      // Alice gained 5 points, Bob gained 0
      const updatedAlice = stateAfterBob.players.find(p => p.id === alice.id);
      const updatedBob = stateAfterBob.players.find(p => p.id === bob.id);
      expect(updatedAlice?.score).toBe(5);
      expect(updatedBob?.score).toBe(0);

      // Check answer records
      const aliceAns = stateAfterBob.allAnswers.find(a => a.player_id === alice.id);
      const bobAns = stateAfterBob.allAnswers.find(a => a.player_id === bob.id);
      expect(aliceAns?.is_correct).toBe(true);
      expect(bobAns?.is_correct).toBe(false);
    });

    it('supports getRoomSync and touchRoomSync without Redis', async () => {
      const { room } = await createRoom('geography', 'Alice');

      const initialSync = await getRoomSync(room.code);
      expect(initialSync).toEqual({
        version: 1,
        statusUpdatedAt: expect.any(Number),
        status: 'waiting',
        currentQuestionIndex: 0,
      });

      // Touch room sync increments version
      const newVersion = await touchRoomSync(room.code);
      expect(newVersion).toBe(2);

      const updatedSync = await getRoomSync(room.code);
      expect(updatedSync?.version).toBe(2);
    });

    it('kicks a player cleanly and triggers sync without Redis', async () => {
      const { room, player: alice } = await createRoom('geography', 'Alice');
      const { player: bob } = await joinRoom(room.code, 'Bob');

      await updateRoomStatus(room.code, 'wager', 0);
      await submitWager(room.code, bob.id, 'q-1', 3);

      // Alice kicks Bob
      const stateAfterKick = await kickPlayer(room.code, bob.id, alice.id);

      expect(stateAfterKick.players).toHaveLength(1);
      expect(stateAfterKick.players[0].name).toBe('Alice');
      expect(stateAfterKick.allAnswers.find(a => a.player_id === bob.id)).toBeUndefined();
    });

    it('advances through multiple rounds and reaches final without Redis', async () => {
      const { room, player: alice } = await createRoom('geography', 'Alice');

      // Round 1
      await updateRoomStatus(room.code, 'wager', 0);
      await submitWager(room.code, alice.id, 'q-1', 10);
      await submitAnswer(room.code, alice.id, 'q-1', 'Paris');

      // Round 2
      await updateRoomStatus(room.code, 'wager', 1);
      await submitWager(room.code, alice.id, 'q-2', 7);
      await submitAnswer(room.code, alice.id, 'q-2', 'Tokyo');

      // Finish game
      const finalState = await updateRoomStatus(room.code, 'final');
      expect(finalState.room?.status).toBe('final');

      const finalAlice = finalState.players.find(p => p.id === alice.id);
      expect(finalAlice?.score).toBe(17); // 10 + 7
    });
  });

  describe('Mid-Game Failover: Redis online initially then fails', () => {
    it('seamlessly transitions from Redis to local store without data loss', async () => {
      // 1. Room created while Redis is functional
      const initialRoom = {
        code: 'MIDG',
        topic: 'geography',
        status: 'waiting',
        current_question_index: 0,
        leader_id: 'alice-id',
        questions: [{ id: 'q-1', text: 'Capital of France?', correct_answer: 'Paris', type: 'text', summary: 'Paris', options: null }],
        version: 1,
        status_updated_at: Date.now(),
      };
      const initialPlayer = { id: 'alice-id', name: 'Alice', score: 0, is_leader: true };

      (redis.get as jest.Mock).mockResolvedValue(initialRoom);
      (redis.set as jest.Mock).mockResolvedValue('OK');
      (redis.hset as jest.Mock).mockResolvedValue(1);
      (redis.hgetall as jest.Mock).mockResolvedValue({
        'alice-id': JSON.stringify(initialPlayer),
      });

      // Fetch state while Redis is up (also primes local store)
      const stateBefore = await getRoomState('MIDG');
      expect(stateBefore.room?.code).toBe('MIDG');
      expect(stateBefore.players).toHaveLength(1);

      // 2. Redis suddenly goes down mid-game
      const redisError = () => Promise.reject(new Error('Redis cluster unreachable 503'));
      (redis.get as jest.Mock).mockImplementation(redisError);
      (redis.set as jest.Mock).mockImplementation(redisError);
      (redis.hset as jest.Mock).mockImplementation(redisError);
      (redis.hget as jest.Mock).mockImplementation(redisError);
      (redis.hgetall as jest.Mock).mockImplementation(redisError);

      // 3. Game continues: Bob joins without Redis
      const { player: bob } = await joinRoom('MIDG', 'Bob');
      expect(bob.name).toBe('Bob');

      // 4. Submit wager and answers without Redis
      await updateRoomStatus('MIDG', 'wager', 0);
      await submitWager('MIDG', 'alice-id', 'q-1', 4);
      await submitWager('MIDG', bob.id, 'q-1', 6);

      const answerState = await submitAnswer('MIDG', 'alice-id', 'q-1', 'Paris');
      expect(answerState.room?.code).toBe('MIDG');

      // Verify state was preserved and updated
      const finalCheck = await getRoomState('MIDG');
      expect(finalCheck.players).toHaveLength(2);
      expect(finalCheck.room?.status).toBe('question');
    });
  });

  describe('Edge Cases & Advanced Redis Fallback Resilience', () => {
    it('propagates state changes written to SQLite even if process memory has an older version cached', async () => {
      const redisError = () => Promise.reject(new Error('ECONNREFUSED'));
      (redis.get as jest.Mock).mockImplementation(redisError);
      (redis.set as jest.Mock).mockImplementation(redisError);

      // Alice creates room in Process A
      const { room } = await createRoom('geography', 'Alice');
      expect(room.version).toBe(1);

      // Verify initial sync sees version 1
      const sync1 = await getRoomSync(room.code);
      expect(sync1?.version).toBe(1);

      // Simulate a concurrent worker or process writing an update (version 2) directly to SQLite
      const { getSqliteDb } = await import('../src/lib/db/sqlite-connection');
      const db = getSqliteDb();
      const updatedRoom = { ...room, version: 2, status: 'wager' as const };
      db.prepare('UPDATE active_rooms SET version = ?, status = ?, data = ? WHERE code = ?')
        .run(2, 'wager', JSON.stringify(updatedRoom), room.code);

      // Calling getRoomSync or getRoomState in this process MUST detect SQLite update and return version 2
      const sync2 = await getRoomSync(room.code);
      expect(sync2?.version).toBe(2);
      expect(sync2?.status).toBe('wager');

      const fullState = await getRoomState(room.code);
      expect(fullState.room?.version).toBe(2);
      expect(fullState.room?.status).toBe('wager');
    });

    it('touchRoomSync does NOT alter status_updated_at when bumping version', async () => {
      const redisError = () => Promise.reject(new Error('ECONNREFUSED'));
      (redis.get as jest.Mock).mockImplementation(redisError);
      (redis.set as jest.Mock).mockImplementation(redisError);

      const { room } = await createRoom('geography', 'Alice');
      const initialSync = await getRoomSync(room.code);
      expect(initialSync).toBeDefined();

      const originalUpdatedAt = initialSync!.statusUpdatedAt;

      // Advance time slightly to test that status_updated_at is not overwritten with Date.now() + 1500
      await new Promise(r => setTimeout(r, 20));

      const newVersion = await touchRoomSync(room.code);
      expect(newVersion).toBe(2);

      const updatedSync = await getRoomSync(room.code);
      expect(updatedSync?.version).toBe(2);
      expect(updatedSync?.statusUpdatedAt).toBe(originalUpdatedAt);
    });

    it('does not reset status_updated_at during partial wagers or player joins', async () => {
      const redisError = () => Promise.reject(new Error('ECONNREFUSED'));
      (redis.get as jest.Mock).mockImplementation(redisError);
      (redis.set as jest.Mock).mockImplementation(redisError);

      const { room, player: alice } = await createRoom('geography', 'Alice');
      const { player: bob } = await joinRoom(room.code, 'Bob');

      // Start game: transitions to 'wager'
      const wagerState = await updateRoomStatus(room.code, 'wager', 0);
      const initialWagerUpdatedAt = wagerState.room!.status_updated_at;
      expect(initialWagerUpdatedAt).toBeDefined();

      await new Promise(r => setTimeout(r, 25));

      // Alice submits wager (Bob has not wagered yet -> room stays in 'wager')
      const afterAliceWager = await submitWager(room.code, alice.id, 'q-1', 5);
      expect(afterAliceWager.room?.status).toBe('wager');
      expect(afterAliceWager.room?.version).toBeGreaterThan(wagerState.room!.version!);
      // status_updated_at MUST NOT have been reset because phase did not change
      expect(afterAliceWager.room?.status_updated_at).toBe(initialWagerUpdatedAt);
    });

    it('does NOT attempt direct Redis calls in step 3 when circuit breaker is open', async () => {
      const redisError = () => Promise.reject(new Error('ECONNREFUSED'));
      (redis.get as jest.Mock).mockImplementation(redisError);

      // 1. Initial call fails and trips breaker
      await gameStore.getRoom('UNKNOWN_ROOM');
      (redis.get as jest.Mock).mockClear();

      // 2. Circuit breaker is now OPEN: getRoom for unknown code should NOT invoke redis.get
      const result = await gameStore.getRoom('ANOTHER_UNKNOWN');
      expect(result).toBeNull();
      expect(redis.get).not.toHaveBeenCalled();
    });
  });
});

