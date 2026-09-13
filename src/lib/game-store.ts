import { Room, Player, Answer, GameState } from "./types/game";
import { redis, ROOM_TTL, isRedisConfigured } from "./redis";
import { getSqliteDb } from "./db/sqlite-connection";

// Circuit breaker state
let redisFailureTimestamp = 0;
let consecutiveFailures = 0;
let lastWarnTimestamp = 0;
const BASE_COOLDOWN_MS = 10_000; // 10s base cooldown after Redis failure
const MAX_COOLDOWN_MS = 60_000; // 60s max cooldown
const REDIS_READ_TIMEOUT_MS = 800; // 800ms max wait for read operations
const REDIS_WRITE_TIMEOUT_MS = 1000; // 1000ms max wait for write operations

function isTestEnv(): boolean {
  return process.env.NODE_ENV === "test";
}

export function getRedisCooldownMs(): number {
  if (consecutiveFailures <= 1) return BASE_COOLDOWN_MS;
  return Math.min(BASE_COOLDOWN_MS * Math.pow(2, consecutiveFailures - 1), MAX_COOLDOWN_MS);
}

export function isCircuitBreakerOpen(): boolean {
  if (redisFailureTimestamp === 0) return false;
  return Date.now() - redisFailureTimestamp < getRedisCooldownMs();
}

export function canAttemptRedis(): boolean {
  if (!redis) return false;
  if (!isRedisConfigured && !isTestEnv()) return false;
  return !isCircuitBreakerOpen();
}

function recordRedisSuccess(): void {
  redisFailureTimestamp = 0;
  consecutiveFailures = 0;
}

function recordRedisFailure(err: unknown) {
  consecutiveFailures++;
  redisFailureTimestamp = Date.now();
  const now = Date.now();
  if (now - lastWarnTimestamp > 10_000) {
    lastWarnTimestamp = now;
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Redis Failover] Upstash operation failed (${msg}). Serving from local store for next ${getRedisCooldownMs() / 1000}s.`);
  }
}

export async function safeRedisCall<T>(op: () => Promise<T>, timeoutMs = REDIS_READ_TIMEOUT_MS): Promise<T | null> {
  if (!canAttemptRedis()) return null;

  let timerId: NodeJS.Timeout | null = null;
  try {
    const result = await Promise.race([
      op(),
      new Promise<never>((_, reject) => {
        timerId = setTimeout(() => reject(new Error("Redis operation timed out")), timeoutMs);
        if (timerId && typeof timerId === "object" && "unref" in timerId) timerId.unref();
      }),
    ]);
    recordRedisSuccess();
    return result;
  } catch (err) {
    recordRedisFailure(err);
    return null;
  } finally {
    if (timerId) clearTimeout(timerId);
  }
}

export async function safeRedisWrite(op: () => Promise<unknown>, timeoutMs = REDIS_WRITE_TIMEOUT_MS): Promise<boolean> {
  if (!canAttemptRedis()) return false;

  let timerId: NodeJS.Timeout | null = null;
  try {
    await Promise.race([
      op(),
      new Promise<never>((_, reject) => {
        timerId = setTimeout(() => reject(new Error("Redis write timed out")), timeoutMs);
        if (timerId && typeof timerId === "object" && "unref" in timerId) timerId.unref();
      }),
    ]);
    recordRedisSuccess();
    return true;
  } catch (err) {
    recordRedisFailure(err);
    return false;
  } finally {
    if (timerId) clearTimeout(timerId);
  }
}

// ---------------------------------------------------------------------------
// LOCAL STORE: In-Memory Cache + Persistent SQLite
// ---------------------------------------------------------------------------

export function normalizeCode(code: string): string {
  return (code || "").trim().toUpperCase();
}

interface MemoryRoomState {
  room: Room | null;
  players: Map<string, Player>;
  answers: Map<string, Answer>; // key: `${playerId}:${questionId}`
  updatedAt: number;
}

const memoryStore = new Map<string, MemoryRoomState>();

function getOrCreateMemory(code: string): MemoryRoomState {
  const normalized = normalizeCode(code);
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

function cloneRoom(room: Room): Room {
  return {
    ...room,
    questions: Array.isArray(room.questions)
      ? room.questions.map(q => ({
          ...q,
          options: q.options ? [...q.options] : null,
        }))
      : [],
  };
}

// Local read helpers
export function getLocalRoom(code: string): Room | null {
  const normalized = normalizeCode(code);
  const state = getOrCreateMemory(normalized);

  // Check SQLite first for authoritative shared state across workers/processes
  const room = runSqlite(db => {
    const row = db.prepare("SELECT data FROM active_rooms WHERE code = ?").get(normalized) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as Room) : null;
  });

  if (room) {
    state.room = cloneRoom(room);
    state.updatedAt = Date.now();
    return cloneRoom(room);
  }

  return state.room ? cloneRoom(state.room) : null;
}

export function getLocalPlayers(code: string): Player[] {
  const normalized = normalizeCode(code);
  const state = getOrCreateMemory(normalized);

  // Check SQLite first for authoritative players
  const players = runSqlite(db => {
    const rows = db.prepare("SELECT data FROM active_players WHERE room_code = ?").all(normalized) as { data: string }[];
    return rows.map(r => JSON.parse(r.data) as Player);
  });

  if (players && players.length > 0) {
    state.players.clear();
    for (const p of players) {
      state.players.set(p.id, { ...p });
    }
    return players.map(p => ({ ...p }));
  }

  return Array.from(state.players.values()).map(p => ({ ...p }));
}

export function getLocalPlayer(code: string, playerId: string): Player | null {
  const normalized = normalizeCode(code);
  const state = getOrCreateMemory(normalized);

  const player = runSqlite(db => {
    const row = db.prepare("SELECT data FROM active_players WHERE room_code = ? AND player_id = ?").get(normalized, playerId) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as Player) : null;
  });

  if (player) {
    state.players.set(playerId, { ...player });
    return { ...player };
  }

  const mem = state.players.get(playerId);
  return mem ? { ...mem } : null;
}

export function getLocalAnswers(code: string): Answer[] {
  const normalized = normalizeCode(code);
  const state = getOrCreateMemory(normalized);

  const answers = runSqlite(db => {
    const rows = db.prepare("SELECT data FROM active_answers WHERE room_code = ?").all(normalized) as { data: string }[];
    return rows.map(r => JSON.parse(r.data) as Answer);
  });

  if (answers && answers.length > 0) {
    state.answers.clear();
    for (const a of answers) {
      state.answers.set(`${a.player_id}:${a.question_id}`, { ...a });
    }
    return answers.map(a => ({ ...a }));
  }

  return Array.from(state.answers.values()).map(a => ({ ...a }));
}

export function getLocalAnswer(code: string, playerId: string, questionId: string): Answer | null {
  const normalized = normalizeCode(code);
  const state = getOrCreateMemory(normalized);
  const key = `${playerId}:${questionId}`;

  const answer = runSqlite(db => {
    const row = db.prepare("SELECT data FROM active_answers WHERE room_code = ? AND player_id = ? AND question_id = ?").get(normalized, playerId, questionId) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as Answer) : null;
  });

  if (answer) {
    state.answers.set(key, { ...answer });
    return { ...answer };
  }

  const mem = state.answers.get(key);
  return mem ? { ...mem } : null;
}

export function saveLocalRoom(code: string, room: Room): void {
  const normalized = normalizeCode(code);
  const state = getOrCreateMemory(normalized);

  // Guard: Never allow an older version to overwrite a newer version in memory
  const currentVersion = state.room?.version || 0;
  if (room.version !== undefined && room.version < currentVersion) {
    return;
  }
  state.room = cloneRoom(room);
  state.updatedAt = Date.now();

  runSqlite(db => {
    db.prepare(`
      INSERT INTO active_rooms (code, data, version, status, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET
        data = CASE WHEN excluded.version >= active_rooms.version THEN excluded.data ELSE active_rooms.data END,
        version = CASE WHEN excluded.version >= active_rooms.version THEN excluded.version ELSE active_rooms.version END,
        status = CASE WHEN excluded.version >= active_rooms.version THEN excluded.status ELSE active_rooms.status END,
        updated_at = excluded.updated_at
    `).run(normalized, JSON.stringify(room), room.version || 1, room.status, Date.now());
  });
}

export function saveLocalPlayer(code: string, player: Player): void {
  const normalized = normalizeCode(code);
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
  const normalized = normalizeCode(code);
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
  const normalized = normalizeCode(code);
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
  const normalized = normalizeCode(code);
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
    const normalized = (code || "").trim().toUpperCase();

    // 1. Try Redis if circuit breaker is not open
    if (canAttemptRedis()) {
      const redisRoom = await safeRedisCall(() => redis.get<Room>(`room:${normalized}`));
      if (redisRoom) {
        const localRoom = getLocalRoom(normalized);
        if (localRoom && (localRoom.version || 0) > (redisRoom.version || 0)) {
          safeRedisWrite(() =>
            Promise.all([
              redis.set(`room:${normalized}`, localRoom, { ex: ROOM_TTL }),
              redis.set(`room_sync:${normalized}`, {
                version: localRoom.version || 0,
                status: localRoom.status,
                status_updated_at: localRoom.status_updated_at || Date.now(),
                current_question_index: localRoom.current_question_index ?? 0,
              }, { ex: ROOM_TTL }),
            ])
          ).catch(() => {});
          return localRoom;
        }

        saveLocalRoom(normalized, redisRoom);
        return redisRoom;
      }
    }

    // 2. Fallback to Local Store (authoritative SQLite fallback)
    return getLocalRoom(normalized);
  },

  async saveRoom(code: string, room: Room): Promise<void> {
    const normalized = normalizeCode(code);

    // 1. Always update local store (immediate write-through)
    saveLocalRoom(normalized, room);

    // 2. Write to Redis if circuit breaker is not open
    if (canAttemptRedis()) {
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
    }
  },

  async getPlayer(code: string, playerId: string): Promise<Player | null> {
    const normalized = normalizeCode(code);

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
    const normalized = normalizeCode(code);

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
    const normalized = normalizeCode(code);

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
    const normalized = normalizeCode(code);
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
    const normalized = normalizeCode(code);
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
    const normalized = normalizeCode(code);

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
    const normalized = (code || "").trim().toUpperCase();

    // 1. Try Redis if circuit breaker is not open
    if (canAttemptRedis()) {
      const redisResult = await safeRedisCall(async () => {
        const [room, playersMap, answersMap] = await Promise.all([
          redis.get<Room>(`room:${normalized}`),
          redis.hgetall<Record<string, string | Player>>(`players:${normalized}`),
          redis.hgetall<Record<string, string | Answer>>(`answers:${normalized}`),
        ]);
        return { room, playersMap, answersMap };
      });

      if (redisResult && redisResult.room) {
        const localRoom = getLocalRoom(normalized);
        if (localRoom && (localRoom.version || 0) > (redisResult.room.version || 0)) {
          safeRedisWrite(() =>
            Promise.all([
              redis.set(`room:${normalized}`, localRoom, { ex: ROOM_TTL }),
              redis.set(`room_sync:${normalized}`, {
                version: localRoom.version || 0,
                status: localRoom.status,
                status_updated_at: localRoom.status_updated_at || Date.now(),
                current_question_index: localRoom.current_question_index ?? 0,
              }, { ex: ROOM_TTL }),
            ])
          ).catch(() => {});
          return getLocalFullState(normalized);
        }

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
    }

    // 2. Check Local Store (authoritative SQLite fallback)
    return getLocalFullState(normalized);
  },

  async getRoomSync(code: string): Promise<{
    version: number;
    statusUpdatedAt: number;
    status: GameState;
    currentQuestionIndex: number;
  } | null> {
    const normalized = normalizeCode(code);
    const localRoom = getLocalRoom(normalized);
    const localSync = localRoom
      ? {
          version: localRoom.version || 0,
          statusUpdatedAt: localRoom.status_updated_at || 0,
          status: localRoom.status,
          currentQuestionIndex: localRoom.current_question_index ?? 0,
        }
      : null;

    // 1. Try Redis if circuit breaker is not open
    if (canAttemptRedis()) {
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
        if (localSync && localSync.version > redisSync.version) {
          return localSync;
        }
        return redisSync;
      }
    }

    // 2. Fallback to Local Store (authoritative SQLite query)
    return localSync;
  },

  async touchRoomSync(code: string): Promise<number> {
    const normalized = normalizeCode(code);
    const localRoom = getLocalRoom(normalized);

    // 1. Try Redis first if circuit breaker is not open
    if (canAttemptRedis()) {
      const redisTouched = await safeRedisCall(async () => {
        const room = await redis.get<Room>(`room:${normalized}`);
        if (!room && !localRoom) return null;

        const baseRoom = (!room || (localRoom && (localRoom.version || 0) > (room.version || 0)))
          ? localRoom!
          : room;

        baseRoom.version = (baseRoom.version || 0) + 1;
        await this.saveRoom(normalized, baseRoom);
        return baseRoom.version || 0;
      });

      if (typeof redisTouched === "number") {
        return redisTouched;
      }
    }

    // 2. Fallback to Local Store
    if (!localRoom) return 0;

    localRoom.version = (localRoom.version || 0) + 1;
    saveLocalRoom(normalized, localRoom);

    // Attempt best-effort write to Redis in background if circuit breaker is not open
    if (canAttemptRedis()) {
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
    }

    return localRoom.version || 0;
  },

  resetMemoryStoreForTesting(): void {
    memoryStore.clear();
    redisFailureTimestamp = 0;
    consecutiveFailures = 0;
    lastWarnTimestamp = 0;
    runSqlite(db => {
      db.exec("DELETE FROM active_rooms; DELETE FROM active_players; DELETE FROM active_answers;");
    });
  },
};
