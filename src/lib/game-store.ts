import { Room, Player, Answer, GameState } from "./types/game";
import { redis, ROOM_TTL, isRedisConfigured } from "./redis";
import { getSqliteDb } from "./db/sqlite-connection";

// Circuit breaker state
let redisFailureTimestamp = 0;
let lastWarnTimestamp = 0;
const REDIS_COOLDOWN_MS = 30_000; // 30s cooldown after Redis failure
const REDIS_TIMEOUT_MS = 400; // 400ms max wait before fallback

function isTestEnv(): boolean {
  return process.env.NODE_ENV === "test";
}

export function isCircuitBreakerOpen(): boolean {
  return Date.now() - redisFailureTimestamp < REDIS_COOLDOWN_MS;
}

export function canAttemptRedis(): boolean {
  if (!redis) return false;
  if (!isRedisConfigured && !isTestEnv()) return false;
  return !isCircuitBreakerOpen();
}

function recordRedisFailure(err: unknown) {
  redisFailureTimestamp = Date.now();
  const now = Date.now();
  if (now - lastWarnTimestamp > 10_000) {
    lastWarnTimestamp = now;
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Redis Failover] Upstash operation failed (${msg}). Serving from local store for next 30s.`);
  }
}

export async function safeRedisCall<T>(op: () => Promise<T>, timeoutMs = REDIS_TIMEOUT_MS): Promise<T | null> {
  if (!canAttemptRedis()) return null;

  try {
    const result = await Promise.race([
      op(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Redis operation timed out")), timeoutMs)
      ),
    ]);
    return result;
  } catch (err) {
    recordRedisFailure(err);
    return null;
  }
}

export async function safeRedisWrite(op: () => Promise<unknown>, timeoutMs = REDIS_TIMEOUT_MS): Promise<boolean> {
  if (!canAttemptRedis()) return false;

  try {
    await Promise.race([
      op(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Redis write timed out")), timeoutMs)
      ),
    ]);
    return true;
  } catch (err) {
    recordRedisFailure(err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// LOCAL STORE: In-Memory Cache + Persistent SQLite
// ---------------------------------------------------------------------------

interface MemoryRoomState {
  room: Room | null;
  players: Map<string, Player>;
  answers: Map<string, Answer>; // key: `${playerId}:${questionId}`
  updatedAt: number;
}

const memoryStore = new Map<string, MemoryRoomState>();

function getOrCreateMemory(code: string): MemoryRoomState {
  const normalized = code.toUpperCase();
  let state = memoryStore.get(normalized);
  if (!state) {
    state = {
      room: null,
      players: new Map(),
      answers: new Map(),
      updatedAt: Date.now(),
    };
    memoryStore.set(normalized, state);
  }
  return state;
}

// SQLite safe execution wrapper
function runSqlite<T>(fn: (db: ReturnType<typeof getSqliteDb>) => T): T | null {
  try {
    const db = getSqliteDb();
    return fn(db);
  } catch {
    // If SQLite is unavailable or in a non-standard environment, memory store still functions
    return null;
  }
}

// Local read helpers
export function getLocalRoom(code: string): Room | null {
  const normalized = code.toUpperCase();
  const state = getOrCreateMemory(normalized);
  if (state.room) return state.room;

  // Check SQLite
  const room = runSqlite(db => {
    const row = db.prepare("SELECT data FROM active_rooms WHERE code = ?").get(normalized) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as Room) : null;
  });

  if (room) {
    state.room = room;
    state.updatedAt = Date.now();
  }
  return room;
}

export function getLocalPlayers(code: string): Player[] {
  const normalized = code.toUpperCase();
  const state = getOrCreateMemory(normalized);
  if (state.players.size > 0) {
    return Array.from(state.players.values());
  }

  // Check SQLite
  const players = runSqlite(db => {
    const rows = db.prepare("SELECT data FROM active_players WHERE room_code = ?").all(normalized) as { data: string }[];
    return rows.map(r => JSON.parse(r.data) as Player);
  });

  if (players && players.length > 0) {
    for (const p of players) {
      state.players.set(p.id, p);
    }
    return players;
  }
  return [];
}

export function getLocalPlayer(code: string, playerId: string): Player | null {
  const normalized = code.toUpperCase();
  const state = getOrCreateMemory(normalized);
  const mem = state.players.get(playerId);
  if (mem) return mem;

  const player = runSqlite(db => {
    const row = db.prepare("SELECT data FROM active_players WHERE room_code = ? AND player_id = ?").get(normalized, playerId) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as Player) : null;
  });

  if (player) {
    state.players.set(playerId, player);
  }
  return player;
}

export function getLocalAnswers(code: string): Answer[] {
  const normalized = code.toUpperCase();
  const state = getOrCreateMemory(normalized);
  if (state.answers.size > 0) {
    return Array.from(state.answers.values());
  }

  const answers = runSqlite(db => {
    const rows = db.prepare("SELECT data FROM active_answers WHERE room_code = ?").all(normalized) as { data: string }[];
    return rows.map(r => JSON.parse(r.data) as Answer);
  });

  if (answers && answers.length > 0) {
    for (const a of answers) {
      state.answers.set(`${a.player_id}:${a.question_id}`, a);
    }
    return answers;
  }
  return [];
}

export function getLocalAnswer(code: string, playerId: string, questionId: string): Answer | null {
  const normalized = code.toUpperCase();
  const state = getOrCreateMemory(normalized);
  const key = `${playerId}:${questionId}`;
  const mem = state.answers.get(key);
  if (mem) return mem;

  const answer = runSqlite(db => {
    const row = db.prepare("SELECT data FROM active_answers WHERE room_code = ? AND player_id = ? AND question_id = ?").get(normalized, playerId, questionId) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as Answer) : null;
  });

  if (answer) {
    state.answers.set(key, answer);
  }
  return answer;
}

export function saveLocalRoom(code: string, room: Room): void {
  const normalized = code.toUpperCase();
  const state = getOrCreateMemory(normalized);
  state.room = { ...room };
  state.updatedAt = Date.now();

  runSqlite(db => {
    db.prepare(`
      INSERT INTO active_rooms (code, data, version, status, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET
        data = excluded.data,
        version = excluded.version,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(normalized, JSON.stringify(room), room.version || 1, room.status, Date.now());
  });
}

export function saveLocalPlayer(code: string, player: Player): void {
  const normalized = code.toUpperCase();
  const state = getOrCreateMemory(normalized);
  state.players.set(player.id, { ...player });
  state.updatedAt = Date.now();

  runSqlite(db => {
    db.prepare(`
      INSERT INTO active_players (room_code, player_id, data, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(room_code, player_id) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `).run(normalized, player.id, JSON.stringify(player), Date.now());
  });
}

export function deleteLocalPlayer(code: string, playerId: string): void {
  const normalized = code.toUpperCase();
  const state = getOrCreateMemory(normalized);
  state.players.delete(playerId);
  for (const key of Array.from(state.answers.keys())) {
    if (key.startsWith(`${playerId}:`)) {
      state.answers.delete(key);
    }
  }
  state.updatedAt = Date.now();

  runSqlite(db => {
    db.prepare("DELETE FROM active_players WHERE room_code = ? AND player_id = ?").run(normalized, playerId);
    db.prepare("DELETE FROM active_answers WHERE room_code = ? AND player_id = ?").run(normalized, playerId);
  });
}

export function saveLocalAnswer(code: string, answer: Answer): void {
  const normalized = code.toUpperCase();
  const state = getOrCreateMemory(normalized);
  const key = `${answer.player_id}:${answer.question_id}`;
  state.answers.set(key, { ...answer });
  state.updatedAt = Date.now();

  runSqlite(db => {
    db.prepare(`
      INSERT INTO active_answers (room_code, player_id, question_id, data, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(room_code, player_id, question_id) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `).run(normalized, answer.player_id, answer.question_id, JSON.stringify(answer), Date.now());
  });
}

export function saveLocalAnswers(code: string, answers: Answer[]): void {
  const normalized = code.toUpperCase();
  const state = getOrCreateMemory(normalized);
  for (const a of answers) {
    state.answers.set(`${a.player_id}:${a.question_id}`, { ...a });
  }
  state.updatedAt = Date.now();

  runSqlite(db => {
    db.exec("BEGIN TRANSACTION;");
    try {
      const stmt = db.prepare(`
        INSERT INTO active_answers (room_code, player_id, question_id, data, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(room_code, player_id, question_id) DO UPDATE SET
          data = excluded.data,
          updated_at = excluded.updated_at
      `);
      for (const a of answers) {
        stmt.run(normalized, a.player_id, a.question_id, JSON.stringify(a), Date.now());
      }
      db.exec("COMMIT;");
    } catch (e) {
      db.exec("ROLLBACK;");
      throw e;
    }
  });
}

export function getLocalFullState(code: string): { room: Room | null; players: Player[]; allAnswers: Answer[] } {
  const room = getLocalRoom(code);
  const players = getLocalPlayers(code);
  const allAnswers = getLocalAnswers(code);
  return { room, players, allAnswers };
}

// ---------------------------------------------------------------------------
// TIERED GAME SESSION STORE (Redis Primary + Local Fallback)
// ---------------------------------------------------------------------------

export const gameStore = {
  async getRoom(code: string): Promise<Room | null> {
    const normalized = code.toUpperCase();

    // 1. Try Redis
    const redisRoom = await safeRedisCall(() => redis.get<Room>(`room:${normalized}`));
    if (redisRoom) {
      saveLocalRoom(normalized, redisRoom);
      return redisRoom;
    }

    // 2. Fallback to Local Store
    return getLocalRoom(normalized);
  },

  async saveRoom(code: string, room: Room): Promise<void> {
    const normalized = code.toUpperCase();

    // 1. Always update local store (immediate write-through)
    saveLocalRoom(normalized, room);

    // 2. Write to Redis
    const syncData = {
      version: room.version || 0,
      status: room.status,
      status_updated_at: room.status_updated_at || Date.now(),
      current_question_index: room.current_question_index ?? 0,
    };

    await safeRedisWrite(() =>
      Promise.all([
        redis.set(`room:${normalized}`, room, { ex: ROOM_TTL }),
        redis.set(`room_sync:${normalized}`, syncData, { ex: ROOM_TTL }),
      ])
    );
  },

  async getPlayer(code: string, playerId: string): Promise<Player | null> {
    const normalized = code.toUpperCase();

    // 1. Try Redis
    const redisPlayerRaw = await safeRedisCall(() =>
      redis.hget<string | Player>(`players:${normalized}`, playerId)
    );
    if (redisPlayerRaw) {
      const player = typeof redisPlayerRaw === "string" ? (JSON.parse(redisPlayerRaw) as Player) : redisPlayerRaw;
      saveLocalPlayer(normalized, player);
      return player;
    }

    // 2. Fallback to Local Store
    return getLocalPlayer(normalized, playerId);
  },

  async setPlayer(code: string, player: Player): Promise<void> {
    const normalized = code.toUpperCase();

    // 1. Update Local Store
    saveLocalPlayer(normalized, player);

    // 2. Update Redis
    await safeRedisWrite(() =>
      Promise.all([
        redis.hset(`players:${normalized}`, { [player.id]: JSON.stringify(player) }),
        redis.expire(`players:${normalized}`, ROOM_TTL),
      ])
    );
  },

  async removePlayer(code: string, playerId: string): Promise<void> {
    const normalized = code.toUpperCase();

    // 1. Update Local Store
    deleteLocalPlayer(normalized, playerId);

    // 2. Update Redis
    await safeRedisWrite(async () => {
      await redis.hdel(`players:${normalized}`, playerId);
      const answersRaw = await redis.hgetall<Record<string, unknown>>(`answers:${normalized}`);
      if (answersRaw) {
        for (const key of Object.keys(answersRaw)) {
          if (key.startsWith(`${playerId}:`)) {
            await redis.hdel(`answers:${normalized}`, key);
          }
        }
      }
    });
  },

  async getAnswer(code: string, playerId: string, questionId: string): Promise<Answer | null> {
    const normalized = code.toUpperCase();
    const key = `${playerId}:${questionId}`;

    // 1. Try Redis
    const raw = await safeRedisCall(() =>
      redis.hget<string | Answer>(`answers:${normalized}`, key)
    );
    if (raw) {
      const ans = typeof raw === "string" ? (JSON.parse(raw) as Answer) : raw;
      saveLocalAnswer(normalized, ans);
      return ans;
    }

    // 2. Fallback to Local Store
    return getLocalAnswer(normalized, playerId, questionId);
  },

  async setAnswer(code: string, answer: Answer): Promise<void> {
    const normalized = code.toUpperCase();
    const key = `${answer.player_id}:${answer.question_id}`;

    // 1. Update Local Store
    saveLocalAnswer(normalized, answer);

    // 2. Update Redis
    await safeRedisWrite(() =>
      Promise.all([
        redis.hset(`answers:${normalized}`, { [key]: JSON.stringify(answer) }),
        redis.expire(`answers:${normalized}`, ROOM_TTL),
      ])
    );
  },

  async setAnswers(code: string, answers: Answer[]): Promise<void> {
    const normalized = code.toUpperCase();

    // 1. Update Local Store
    saveLocalAnswers(normalized, answers);

    // 2. Update Redis
    const updates: Record<string, string> = {};
    for (const a of answers) {
      updates[`${a.player_id}:${a.question_id}`] = JSON.stringify(a);
    }

    await safeRedisWrite(() =>
      Promise.all([
        redis.hset(`answers:${normalized}`, updates),
        redis.expire(`answers:${normalized}`, ROOM_TTL),
      ])
    );
  },

  async getFullState(code: string): Promise<{ room: Room | null; players: Player[]; allAnswers: Answer[] }> {
    const normalized = code.toUpperCase();

    // 1. Try Redis
    const redisResult = await safeRedisCall(async () => {
      const [room, playersMap, answersMap] = await Promise.all([
        redis.get<Room>(`room:${normalized}`),
        redis.hgetall<Record<string, string | Player>>(`players:${normalized}`),
        redis.hgetall<Record<string, string | Answer>>(`answers:${normalized}`),
      ]);
      return { room, playersMap, answersMap };
    });

    if (redisResult && redisResult.room) {
      const players: Player[] = redisResult.playersMap
        ? Object.values(redisResult.playersMap).map(p => (typeof p === "string" ? JSON.parse(p) : p))
        : [];
      const allAnswers: Answer[] = redisResult.answersMap
        ? Object.values(redisResult.answersMap).map(a => (typeof a === "string" ? JSON.parse(a) : a))
        : [];

      // Mirror fresh Redis state to Local Store
      saveLocalRoom(normalized, redisResult.room);
      for (const p of players) saveLocalPlayer(normalized, p);
      if (allAnswers.length > 0) saveLocalAnswers(normalized, allAnswers);

      return { room: redisResult.room, players, allAnswers };
    }

    // 2. Fallback to Local Store
    return getLocalFullState(normalized);
  },

  async getRoomSync(code: string): Promise<{
    version: number;
    statusUpdatedAt: number;
    status: GameState;
    currentQuestionIndex: number;
  } | null> {
    const normalized = code.toUpperCase();

    // 1. Try Redis
    const redisSync = await safeRedisCall(async () => {
      const sync = await redis.get<{
        version: number;
        status_updated_at: number;
        status: GameState;
        current_question_index: number;
      }>(`room_sync:${normalized}`);

      if (sync) {
        return {
          version: sync.version || 0,
          statusUpdatedAt: sync.status_updated_at || 0,
          status: sync.status,
          currentQuestionIndex: sync.current_question_index ?? 0,
        };
      }

      const room = await redis.get<Room>(`room:${normalized}`);
      if (!room) return null;
      return {
        version: room.version || 0,
        statusUpdatedAt: room.status_updated_at || 0,
        status: room.status,
        currentQuestionIndex: room.current_question_index ?? 0,
      };
    });

    if (redisSync) {
      return redisSync;
    }

    // 2. Fallback to Local Store
    const localRoom = getLocalRoom(normalized);
    if (localRoom) {
      return {
        version: localRoom.version || 0,
        statusUpdatedAt: localRoom.status_updated_at || 0,
        status: localRoom.status,
        currentQuestionIndex: localRoom.current_question_index ?? 0,
      };
    }
    return null;
  },

  async touchRoomSync(code: string): Promise<number> {
    const normalized = code.toUpperCase();

    // 1. Try Redis first
    const redisTouched = await safeRedisCall(async () => {
      const room = await redis.get<Room>(`room:${normalized}`);
      if (!room) return null;
      room.version = (room.version || 0) + 1;
      room.status_updated_at = Date.now() + 1500;
      await this.saveRoom(normalized, room);
      return room.version || 0;
    });

    if (typeof redisTouched === "number") {
      return redisTouched;
    }

    // 2. Fallback to Local Store
    const localRoom = getLocalRoom(normalized);
    if (!localRoom) return 0;

    localRoom.version = (localRoom.version || 0) + 1;
    localRoom.status_updated_at = Date.now() + 1500;
    saveLocalRoom(normalized, localRoom);

    // Attempt best-effort write to Redis in background
    safeRedisWrite(() =>
      Promise.all([
        redis.set(`room:${normalized}`, localRoom, { ex: ROOM_TTL }),
        redis.set(
          `room_sync:${normalized}`,
          {
            version: localRoom.version,
            status: localRoom.status,
            status_updated_at: localRoom.status_updated_at,
            current_question_index: localRoom.current_question_index,
          },
          { ex: ROOM_TTL }
        ),
      ])
    ).catch(() => {});

    return localRoom.version || 0;
  },

  resetMemoryStoreForTesting(): void {
    memoryStore.clear();
    redisFailureTimestamp = 0;
    lastWarnTimestamp = 0;
  },
};
