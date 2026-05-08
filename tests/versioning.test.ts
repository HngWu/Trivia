import { createRoom, updateRoomStatus, getServerTime, submitWager, submitAnswer } from '../src/lib/actions';
import { redis } from '../src/lib/redis';

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
  ROOM_TTL: 3600,
}));

// Mock supabase
jest.mock('../src/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ data: [{ id: 'q1', text: 'Test?', topic: 'test', correct_answer: 'Yes', summary: 'test', type: 'text' }], error: null }),
  }),
}));

describe('Server Actions - Versioning & Sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getServerTime returns current timestamp', async () => {
    const time = await getServerTime();
    expect(typeof time).toBe('number');
    expect(time).toBeLessThanOrEqual(Date.now());
  });

  it('createRoom initializes version to 1', async () => {
    const result = await createRoom('test', 'Leader');
    expect(result.room.version).toBe(1);
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('room:'),
      expect.objectContaining({ version: 1 }),
      expect.any(Object)
    );
  });

  it('updateRoomStatus increments version', async () => {
    const mockRoom = {
      code: 'TEST',
      status: 'waiting',
      version: 1,
      questions: [],
    };
    (redis.get as jest.Mock).mockResolvedValue(mockRoom);
    (redis.hgetall as jest.Mock).mockResolvedValue({});

    const result = await updateRoomStatus('TEST', 'wager');
    
    expect(result.room?.version).toBe(2);
    expect(redis.set).toHaveBeenCalledWith(
      'room:TEST',
      expect.objectContaining({ version: 2, status: 'wager' }),
      expect.any(Object)
    );
  });

  it('submitWager increments version when status transitions to question', async () => {
    const mockRoom = {
      code: 'TEST',
      status: 'wager',
      version: 1,
      questions: [{ id: 'q1' }],
    };
    (redis.get as jest.Mock).mockResolvedValue(mockRoom);
    (redis.hgetall as jest.Mock)
      .mockResolvedValueOnce({ 'p1': JSON.stringify({ id: 'p1' }) }) // players
      .mockResolvedValueOnce({ 'p1:q1': JSON.stringify({ player_id: 'p1', question_id: 'q1', wager: 5 }) }) // answers
      .mockResolvedValueOnce({ 'p1': JSON.stringify({ id: 'p1' }) }) // players
      .mockResolvedValueOnce({ 'p1:q1': JSON.stringify({ player_id: 'p1', question_id: 'q1', wager: 5 }) }); // answers

    const result = await submitWager('TEST', 'p1', 'q1', 5);
    
    expect(result.room?.status).toBe('question');
    expect(result.room?.version).toBe(2);
  });

  it('submitAnswer increments version when status transitions to results', async () => {
    const mockRoom = {
      code: 'TEST',
      status: 'question',
      version: 2,
      questions: [{ id: 'q1', correct_answer: 'Paris' }],
    };
    (redis.get as jest.Mock).mockResolvedValue(mockRoom);
    (redis.hget as jest.Mock).mockResolvedValue(JSON.stringify({ player_id: 'p1', question_id: 'q1', wager: 5 }));
    
    (redis.hgetall as jest.Mock)
      .mockResolvedValueOnce({ 'p1': JSON.stringify({ id: 'p1' }) }) // players
      .mockResolvedValueOnce({ 'p1:q1': JSON.stringify({ player_id: 'p1', question_id: 'q1', wager: 5, submitted_answer: 'Paris' }) }) // answers
      .mockResolvedValueOnce({ 'p1': JSON.stringify({ id: 'p1' }) }) // players
      .mockResolvedValueOnce({ 'p1:q1': JSON.stringify({ player_id: 'p1', question_id: 'q1', wager: 5, submitted_answer: 'Paris' }) }); // answers

    const result = await submitAnswer('TEST', 'p1', 'q1', 'Paris');
    
    expect(result.room?.status).toBe('results');
    expect(result.room?.version).toBe(3);
  });
});
