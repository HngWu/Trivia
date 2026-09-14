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

import { createRoom, joinRoom, submitWager, submitAnswer, updateRoomStatus, getRoomState } from "@/lib/actions";
import { gameStore } from "@/lib/game-store";
import { resetSqliteDbForTesting } from "@/lib/db/sqlite-connection";

describe("Concurrent Multiplayer Actions", () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
    gameStore.resetMemoryStoreForTesting();
  });

  test("multiple simultaneous wagers advance room cleanly to question phase without rollback", async () => {
    const { room, player: p1 } = await createRoom("history", "P1");
    const { player: p2 } = await joinRoom(room.code, "P2");
    const { player: p3 } = await joinRoom(room.code, "P3");

    await updateRoomStatus(room.code, "wager");
    const qId = room.questions[0].id;

    // Simulate 3 concurrent wager submissions
    await Promise.all([
      submitWager(room.code, p1.id, qId, 5),
      submitWager(room.code, p2.id, qId, 8),
      submitWager(room.code, p3.id, qId, 3),
    ]);

    const finalState = await getRoomState(room.code);
    const answers = finalState.allAnswers.filter(a => a.question_id === qId);
    expect(answers.length).toBe(3);
    // Status must be automatically transitioned to 'question' because all 3 submitted wagers
    expect(finalState.room?.status).toBe("question");
  });

  test("multiple simultaneous answers advance room cleanly to results phase without rollback", async () => {
    const { room, player: p1 } = await createRoom("history", "P1");
    const { player: p2 } = await joinRoom(room.code, "P2");

    await updateRoomStatus(room.code, "wager");
    const qId = room.questions[0].id;
    await submitWager(room.code, p1.id, qId, 5);
    await submitWager(room.code, p2.id, qId, 8);

    // Now in question phase
    await Promise.all([
      submitAnswer(room.code, p1.id, qId, room.questions[0].correct_answer),
      submitAnswer(room.code, p2.id, qId, "wrong answer"),
    ]);

    const finalState = await getRoomState(room.code);
    const answers = finalState.allAnswers.filter(a => a.question_id === qId && a.submitted_answer !== "");
    expect(answers.length).toBe(2);
    expect(finalState.room?.status).toBe("results");
  });
});
