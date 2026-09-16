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

import { saveLocalPlayer, getLocalPlayers, getLocalAnswers, saveLocalAnswer, gameStore } from "@/lib/game-store";
import { resetSqliteDbForTesting } from "@/lib/db/sqlite-connection";
import { Player, Answer } from "@/lib/types/game";

describe("Player & Answer Preservation", () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
    gameStore.resetMemoryStoreForTesting();
  });

  test("getLocalPlayers merges memory and SQLite and never drops known players", () => {
    const code = "ROOM1";
    const p1: Player = { id: "p1", name: "Alice", score: 10, is_leader: true };
    const p2: Player = { id: "p2", name: "Bob", score: 5, is_leader: false };

    saveLocalPlayer(code, p1);
    saveLocalPlayer(code, p2);

    const players = getLocalPlayers(code);
    expect(players.length).toBe(2);
    expect(players.find(p => p.id === "p1")?.name).toBe("Alice");
    expect(players.find(p => p.id === "p2")?.name).toBe("Bob");
  });

  test("getLocalAnswers merges memory and SQLite and never drops known answers", () => {
    const code = "ROOM1";
    const a1: Answer = { player_id: "p1", question_id: "q1", wager: 5, submitted_answer: "ans1", is_correct: true };
    const a2: Answer = { player_id: "p2", question_id: "q1", wager: 8, submitted_answer: "ans2", is_correct: false };

    saveLocalAnswer(code, a1);
    saveLocalAnswer(code, a2);

    const answers = getLocalAnswers(code);
    expect(answers.length).toBe(2);
    expect(answers.find(a => a.player_id === "p1")?.wager).toBe(5);
    expect(answers.find(a => a.player_id === "p2")?.wager).toBe(8);
  });
});
