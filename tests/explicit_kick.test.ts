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

import { createRoom, joinRoom, kickPlayer, getRoomState } from "@/lib/actions";
import { gameStore } from "@/lib/game-store";
import { resetSqliteDbForTesting } from "@/lib/db/sqlite-connection";

describe("Explicit Kick Tracking", () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
    gameStore.resetMemoryStoreForTesting();
  });

  test("explicitly tracks kicked player IDs on room and does not kick players on transient empty reads", async () => {
    const { room, player: leader } = await createRoom("history", "Leader");
    const { player: player2 } = await joinRoom(room.code, "Player2");

    let state = await getRoomState(room.code);
    expect(state.room?.kicked_players).toBeUndefined();
    expect(state.players.length).toBe(2);

    // Leader kicks player2
    await kickPlayer(room.code, player2.id, leader.id);

    state = await getRoomState(room.code);
    expect(state.room?.kicked_players).toContain(player2.id);
    expect(state.players.find(p => p.id === player2.id)).toBeUndefined();
  });
});
