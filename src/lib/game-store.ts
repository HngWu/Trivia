import { Room, Player, Answer, GameState } from "./types/game";
import { redis, ROOM_TTL } from "./redis";
import { getSqliteDb } from "./db/sqlite-connection";
import {
  canAttemptRedis,
  safeRedisCall,
  safeRedisWrite,
  resetRedisBreaker,
  isCircuitBreakerOpen,
  getRedisCooldownMs,
} from "./redis-breaker";

// Export breaker status helpers so callers and tests can inspect failover state
export { isCircuitBreakerOpen, canAttemptRedis, getRedisCooldownMs };

// ---------------------------------------------------------------------------
// LOCAL STORE: In-Memory Cache + Persistent SQLite (WAL Mode)
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
    // If SQLite is unavailable, memory store still functions
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
      INSERT INTO active_rooms (code, data, version, status, status_updated_at, current_question_index, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET
        data = CASE WHEN excluded.version >= active_rooms.version THEN excluded.data ELSE active_rooms.data END,
        version = CASE WHEN excluded.version >= active_rooms.version THEN excluded.version ELSE active_rooms.version END,
        status = CASE WHEN excluded.version >= active_rooms.version THEN excluded.status ELSE active_rooms.status END,
        status_updated_at = CASE WHEN excluded.version >= active_rooms.version THEN excluded.status_updated_at ELSE active_rooms.status_updated_at END,
        current_question_index = CASE WHEN excluded.version >= active_rooms.version THEN excluded.current_question_index ELSE active_rooms.current_question_index END,
        updated_at = excluded.updated_at
    `).run(
      normalized,
      JSON.stringify(room),
      room.version || 1,
      room.status,
      room.status_updated_at || Date.now(),
      room.current_question_index ?? 0,
      Date.now()
    );
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

// Ultra-fast metadata query for client polling: runs in < 0.05ms without questions JSON parsing
export function getLocalRoomSync(code: string): {
  version: number;
  statusUpdatedAt: number;
  status: GameState;
  currentQuestionIndex: number;
} | null {
  const normalized = normalizeCode(code);
  const state = getOrCreateMemory(normalized);

  const row = runSqlite(db => {
    return db.prepare("SELECT version, status, status_updated_at, current_question_index, updated_at FROM active_rooms WHERE code = ?").get(normalized) as {
      version: number;
      status: GameState;
      status_updated_at: number | null;
      current_question_index: number | null;
      updated_at: number;
    } | undefined;
  });

  if (row) {
    const sqliteVersion = row.version || 0;
    const memVersion = state.room?.version || 0;
    if (memVersion > sqliteVersion && state.room) {
      return {
        version: memVersion,
        statusUpdatedAt: state.room.status_updated_at || state.updatedAt,
        status: state.room.status,
        currentQuestionIndex: state.room.current_question_index ?? 0,
      };
    }
    return {
      version: row.version,
      statusUpdatedAt: row.status_updated_at || row.updated_at,
      status: row.status,
      currentQuestionIndex: row.current_question_index ?? 0,
    };
  }

  if (state.room) {
    return {
      version: state.room.version || 0,
      statusUpdatedAt: state.room.status_updated_at || state.updatedAt,
      status: state.room.status,
      currentQuestionIndex: state.room.current_question_index ?? 0,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// TIERED GAME SESSION STORE (Authoritative Local Engine + Non-Blocking Redis)
// ---------------------------------------------------------------------------

export const gameStore = {
  async getRoom(code: string): Promise<Room | null> {
    const normalized = normalizeCode(code);

    // 1. Try Redis if allowed by circuit breaker and mode
    if (canAttemptRedis()) {
      const redisRoom = await safeRedisCall(() => redis.get<Room>(`room:${normalized}`));
      if (redisRoom) {
        const localRoom = getLocalRoom(normalized);
        if (localRoom && (localRoom.version || 0) > (redisRoom.version || 0)) {
          // Asynchronous sync to Redis without blocking caller
          void safeRedisWrite(() =>
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

    // 2. Fallback to Local Store (authoritative SQLite + Memory)
    return getLocalRoom(normalized);
  },

  async saveRoom(code: string, room: Room): Promise<void> {
    const normalized = normalizeCode(code);

    // 1. Always update local store immediately (<0.5ms write-through)
    saveLocalRoom(normalized, room);

    // 2. Asynchronously dispatch write to Redis in background (non-blocking)
    if (canAttemptRedis()) {
      const syncData = {
        version: room.version || 0,
        status: room.status,
        status_updated_at: room.status_updated_at || Date.now(),
        current_question_index: room.current_question_index ?? 0,
      };

      void safeRedisWrite(() =>
        Promise.all([
          redis.set(`room:${normalized}`, room, { ex: ROOM_TTL }),
          redis.set(`room_sync:${normalized}`, syncData, { ex: ROOM_TTL }),
        ])
      ).catch(() => {});
    }
  },

  async getPlayer(code: string, playerId: string): Promise<Player | null> {
    const normalized = normalizeCode(code);

    // 1. Try Redis
    if (canAttemptRedis()) {
      const redisPlayerRaw = await safeRedisCall(() =>
        redis.hget<string | Player>(`players:${normalized}`, playerId)
      );
      if (redisPlayerRaw) {
        const player = typeof redisPlayerRaw === "string" ? (JSON.parse(redisPlayerRaw) as Player) : redisPlayerRaw;
        saveLocalPlayer(normalized, player);
        return player;
      }
    }

    // 2. Fallback to Local Store
    return getLocalPlayer(normalized, playerId);
  },

  async setPlayer(code: string, player: Player): Promise<void> {
    const normalized = normalizeCode(code);

    // 1. Update Local Store immediately
    saveLocalPlayer(normalized, player);

    // 2. Asynchronously dispatch write to Redis in background (non-blocking)
    if (canAttemptRedis()) {
      void safeRedisWrite(() =>
        Promise.all([
          redis.hset(`players:${normalized}`, { [player.id]: JSON.stringify(player) }),
          redis.expire(`players:${normalized}`, ROOM_TTL),
        ])
      ).catch(() => {});
    }
  },

  async removePlayer(code: string, playerId: string): Promise<void> {
    const normalized = normalizeCode(code);

    // 1. Update Local Store immediately
    deleteLocalPlayer(normalized, playerId);

    // 2. Asynchronously dispatch removal to Redis in background (non-blocking)
    if (canAttemptRedis()) {
      void safeRedisWrite(async () => {
        await redis.hdel(`players:${normalized}`, playerId);
        const answersRaw = await redis.hgetall<Record<string, unknown>>(`answers:${normalized}`);
        if (answersRaw) {
          for (const key of Object.keys(answersRaw)) {
            if (key.startsWith(`${playerId}:`)) {
              await redis.hdel(`answers:${normalized}`, key);
            }
          }
        }
      }).catch(() => {});
    }
  },

  async getAnswer(code: string, playerId: string, questionId: string): Promise<Answer | null> {
    const normalized = normalizeCode(code);
    const key = `${playerId}:${questionId}`;

    // 1. Try Redis
    if (canAttemptRedis()) {
      const raw = await safeRedisCall(() =>
        redis.hget<string | Answer>(`answers:${normalized}`, key)
      );
      if (raw) {
        const ans = typeof raw === "string" ? (JSON.parse(raw) as Answer) : raw;
        saveLocalAnswer(normalized, ans);
        return ans;
      }
    }

    // 2. Fallback to Local Store
    return getLocalAnswer(normalized, playerId, questionId);
  },

  async setAnswer(code: string, answer: Answer): Promise<void> {
    const normalized = normalizeCode(code);
    const key = `${answer.player_id}:${answer.question_id}`;

    // 1. Update Local Store immediately
    saveLocalAnswer(normalized, answer);

    // 2. Asynchronously dispatch write to Redis in background (non-blocking)
    if (canAttemptRedis()) {
      void safeRedisWrite(() =>
        Promise.all([
          redis.hset(`answers:${normalized}`, { [key]: JSON.stringify(answer) }),
          redis.expire(`answers:${normalized}`, ROOM_TTL),
        ])
      ).catch(() => {});
    }
  },

  async setAnswers(code: string, answers: Answer[]): Promise<void> {
    const normalized = normalizeCode(code);

    // 1. Update Local Store immediately
    saveLocalAnswers(normalized, answers);

    // 2. Asynchronously dispatch write to Redis in background (non-blocking)
    if (canAttemptRedis()) {
      const updates: Record<string, string> = {};
      for (const a of answers) {
        updates[`${a.player_id}:${a.question_id}`] = JSON.stringify(a);
      }

      void safeRedisWrite(() =>
        Promise.all([
          redis.hset(`answers:${normalized}`, updates),
          redis.expire(`answers:${normalized}`, ROOM_TTL),
        ])
      ).catch(() => {});
    }
  },

  async getFullState(code: string): Promise<{ room: Room | null; players: Player[]; allAnswers: Answer[] }> {
    const normalized = normalizeCode(code);

    // 1. Try Redis if circuit breaker is not open and mode is allowed
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
          void safeRedisWrite(() =>
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
    const localSync = getLocalRoomSync(normalized);

    // 1. Try Redis if circuit breaker is not open and mode is allowed
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

    // 2. Fallback to Local Store (ultra-fast metadata query)
    return localSync;
  },

  async touchRoomSync(code: string): Promise<number> {
    const normalized = normalizeCode(code);
    const localRoom = getLocalRoom(normalized);

    // 1. Try Redis first if breaker allows
    if (canAttemptRedis()) {
      const redisTouched = await safeRedisCall(async () => {
        const room = await redis.get<Room>(`room:${normalized}`);
        if (!room && !localRoom) return null;

        const baseRoom = room || localRoom;
        if (!baseRoom) return null;

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
      void safeRedisWrite(() =>
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
    resetRedisBreaker();
    runSqlite(db => {
      db.exec("DELETE FROM active_rooms; DELETE FROM active_players; DELETE FROM active_answers;");
    });
  },
};
