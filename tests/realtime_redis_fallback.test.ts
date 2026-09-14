import { getRoomSync, touchRoomSync } from '../src/lib/actions';
import { redis } from '../src/lib/redis';
import { gameStore } from '../src/lib/game-store';
import { resetSqliteDbForTesting, closeSqliteDb } from '../src/lib/db/sqlite-connection';

// Mock redis
jest.mock('../src/lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    hset: jest.fn(),
    hget: jest.fn(),
    expire: jest.fn(),
    hgetall: jest.fn(),
  },
  ROOM_TTL: 86400,
}));

// Mock db
jest.mock('../src/lib/db', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    getQuestionsForTopic: jest.fn().mockResolvedValue([]),
  }),
}));

// Mock supabase server
jest.mock('../src/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({}),
}));

describe('Realtime & Redis Fallback Sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSqliteDbForTesting();
    gameStore.resetMemoryStoreForTesting();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  describe('getRoomSync', () => {
    it('returns sync data from lightweight room_sync key when present', async () => {
      const mockSync = {
        version: 5,
        status_updated_at: 12345678,
        status: 'question',
        current_question_index: 2,
      };
      (redis.get as jest.Mock).mockResolvedValueOnce(mockSync);

      const result = await getRoomSync('TEST');

      expect(redis.get).toHaveBeenCalledWith('room_sync:TEST');
      expect(result).toEqual({
        version: 5,
        statusUpdatedAt: 12345678,
        status: 'question',
        currentQuestionIndex: 2,
      });
    });

    it('falls back to room key when room_sync key is absent', async () => {
      // First call returns null (room_sync:TEST not found)
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      // Second call returns full Room object (room:TEST)
      const mockRoom = {
        code: 'TEST',
        version: 4,
        status_updated_at: 87654321,
        status: 'wager',
        current_question_index: 1,
      };
      (redis.get as jest.Mock).mockResolvedValueOnce(mockRoom);

      const result = await getRoomSync('TEST');

      expect(redis.get).toHaveBeenNthCalledWith(1, 'room_sync:TEST');
      expect(redis.get).toHaveBeenNthCalledWith(2, 'room:TEST');
      expect(result).toEqual({
        version: 4,
        statusUpdatedAt: 87654321,
        status: 'wager',
        currentQuestionIndex: 1,
      });
    });

    it('returns null if room does not exist', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);

      const result = await getRoomSync('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('touchRoomSync', () => {
    it('increments version and persists to both room and room_sync', async () => {
      const mockRoom = {
        code: 'TEST',
        version: 3,
        status: 'question',
        current_question_index: 0,
      };
      (redis.get as jest.Mock).mockResolvedValueOnce(mockRoom);

      const newVersion = await touchRoomSync('TEST');

      expect(newVersion).toBe(4);
      expect(redis.set).toHaveBeenCalledWith(
        'room:TEST',
        expect.objectContaining({ version: 4 }),
        expect.any(Object)
      );
      expect(redis.set).toHaveBeenCalledWith(
        'room_sync:TEST',
        expect.objectContaining({ version: 4, status: 'question' }),
        expect.any(Object)
      );
    });

    it('returns 0 if room does not exist', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      const newVersion = await touchRoomSync('NONEXISTENT');

      expect(newVersion).toBe(0);
      expect(redis.set).not.toHaveBeenCalled();
    });
  });
});
