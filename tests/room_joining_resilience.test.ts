/**
 * @jest-environment node
 */
jest.mock('../src/lib/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    hget: jest.fn().mockResolvedValue(null),
    hset: jest.fn().mockResolvedValue(1),
    hgetall: jest.fn().mockResolvedValue(null),
    expire: jest.fn().mockResolvedValue(1),
  },
  ROOM_TTL: 3600,
  isRedisConfigured: true,
}));

import { gameStore, normalizeCode } from '@/lib/game-store';
import { joinRoom, createRoom, getRoomState } from '@/lib/actions';
import { resetSqliteDbForTesting, closeSqliteDb } from '@/lib/db/sqlite-connection';

jest.mock('../src/lib/ai', () => ({
  generateAIQuestions: jest.fn().mockResolvedValue([
    {
      id: 'q1',
      summary: 'Q1',
      text: 'Question 1',
      type: 'multiple_choice',
      options: ['A', 'B'],
      correct_answer: 'A',
      explanation: 'None'
    }
  ]),
  generateRoasts: jest.fn().mockResolvedValue({})
}));

describe('Room Joining & Code Normalization Resilience', () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
    gameStore.resetMemoryStoreForTesting();
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it('normalizes room codes with trim and uppercase', () => {
    expect(normalizeCode(' abcd ')).toBe('ABCD');
    expect(normalizeCode('XyZ9')).toBe('XYZ9');
    expect(normalizeCode('  ')).toBe('');
    expect(normalizeCode(null as unknown as string)).toBe('');
    expect(normalizeCode(undefined as unknown as string)).toBe('');
  });

  it('allows joining with lowercase and whitespace in room code and nickname', async () => {
    // Create a room
    const { room: createdRoom } = await createRoom('general', 'Alice');
    expect(createdRoom.code).toBeDefined();

    // Join with lowercase and trailing whitespace in code and nickname
    const joinCode = `  ${createdRoom.code.toLowerCase()}  `;
    const { room, player } = await joinRoom(joinCode, '  Bob  ');

    expect(room.code).toBe(createdRoom.code);
    expect(player.name).toBe('Bob');
    expect(player.is_leader).toBe(false);

    // Verify room state reflects both players
    const fullState = await getRoomState(joinCode);
    expect(fullState.players.length).toBe(2);
    expect(fullState.players.map(p => p.name)).toContain('Bob');
  });

  it('returns existing player if same name joins again', async () => {
    const { room: createdRoom } = await createRoom('general', 'Leader');
    const firstJoin = await joinRoom(createdRoom.code, 'Charlie');
    const secondJoin = await joinRoom(createdRoom.code.toLowerCase(), 'charlie');

    expect(secondJoin.player.id).toBe(firstJoin.player.id);
  });

  it('throws helpful error if room not found', async () => {
    await expect(joinRoom('NONEXISTENT', 'Player')).rejects.toThrow('Room not found');
  });
});
