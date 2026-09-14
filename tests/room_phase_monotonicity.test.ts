/**
 * @jest-environment node
 */
jest.mock('../src/lib/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    hset: jest.fn().mockResolvedValue(1),
    hget: jest.fn().mockResolvedValue(null),
    hdel: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    hgetall: jest.fn().mockResolvedValue(null),
  },
  ROOM_TTL: 86400,
  isRedisConfigured: false,
}));

import { saveLocalRoom, getLocalRoom, gameStore } from "@/lib/game-store";
import { resetSqliteDbForTesting } from "@/lib/db/sqlite-connection";
import { Room } from "@/lib/types/game";

describe("Room Phase Monotonicity & Save Conflict Resolution", () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
    gameStore.resetMemoryStoreForTesting();
  });

  test("never allows equal or older version to roll back status phase within same round", () => {
    const code = "TEST";
    const baseRoom: Room = {
      code,
      topic: "history",
      status: "question",
      current_question_index: 0,
      leader_id: "leader1",
      questions: [],
      version: 5,
    };

    saveLocalRoom(code, baseRoom);

    // Stale concurrent write with same version and older status ('wager')
    const staleRoom: Room = {
      ...baseRoom,
      status: "wager",
      version: 5,
    };
    saveLocalRoom(code, staleRoom);

    const result = getLocalRoom(code);
    expect(result?.status).toBe("question");
    expect(result?.version).toBe(5);
  });
});
