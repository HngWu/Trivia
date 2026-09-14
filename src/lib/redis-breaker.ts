import { redis, isRedisConfigured } from "./redis";
import { getSqliteDb } from "./db/sqlite-connection";

export type RedisMode = "auto" | "fallback_only" | "redis_only";
export type RedisHealth = "healthy" | "degraded" | "offline";

export interface RedisStatus {
  mode: RedisMode;
  health: RedisHealth;
  isConfigured: boolean;
  consecutiveFailures: number;
  lastFailureTime: number;
  cooldownMs: number;
  isCircuitBreakerOpen: boolean;
}

// In-memory cache for ultra-low latency (<0.001ms)
let cachedMode: RedisMode | null = null;
let redisFailureTimestamp = 0;
let consecutiveFailures = 0;
let lastWarnTimestamp = 0;

const BASE_COOLDOWN_MS = 15_000; // 15s base cooldown
const MAX_COOLDOWN_MS = 60_000;  // 60s max cooldown
export const FAST_REDIS_READ_TIMEOUT_MS = 150;  // 150ms fast timeout for reads
export const FAST_REDIS_WRITE_TIMEOUT_MS = 500; // 500ms max wait for background writes

function isTestEnv(): boolean {
  return process.env.NODE_ENV === "test";
}

function runSqlite<T>(fn: (db: ReturnType<typeof getSqliteDb>) => T): T | null {
  try {
    const db = getSqliteDb();
    return fn(db);
  } catch {
    return null;
  }
}

export function getRedisMode(): RedisMode {
  if (cachedMode) return cachedMode;

  const dbMode = runSqlite(db => {
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'redis_mode'").get() as { value: string } | undefined;
    return row?.value as RedisMode | undefined;
  });

  cachedMode = dbMode && ["auto", "fallback_only", "redis_only"].includes(dbMode) ? dbMode : "auto";
  return cachedMode;
}

export function setRedisMode(mode: RedisMode): void {
  cachedMode = mode;
  runSqlite(db => {
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('redis_mode', ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(mode);
  });
}

export function clearRedisModeCache(): void {
  cachedMode = null;
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
  const mode = getRedisMode();
  if (mode === "fallback_only") return false;

  if (!redis) return false;
  if (!isRedisConfigured && !isTestEnv()) return false;

  if (mode === "redis_only") return true;

  // mode === "auto": respect circuit breaker
  return !isCircuitBreakerOpen();
}

export function recordRedisSuccess(): void {
  redisFailureTimestamp = 0;
  consecutiveFailures = 0;
}

export function recordRedisFailure(err: unknown): void {
  consecutiveFailures++;
  redisFailureTimestamp = Date.now();
  const now = Date.now();
  if (now - lastWarnTimestamp > 10_000) {
    lastWarnTimestamp = now;
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Redis Breaker] Redis operation failed (${msg}). Serving from local fallback engine for next ${getRedisCooldownMs() / 1000}s.`);
  }
}

export async function safeRedisCall<T>(
  op: () => Promise<T>,
  timeoutMs = FAST_REDIS_READ_TIMEOUT_MS
): Promise<T | null> {
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

export async function safeRedisWrite(
  op: () => Promise<unknown>,
  timeoutMs = FAST_REDIS_WRITE_TIMEOUT_MS
): Promise<boolean> {
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

export async function testRedisPing(): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  if (!isRedisConfigured && !isTestEnv()) {
    return { success: false, latencyMs: 0, error: "Redis is not configured in environment." };
  }

  const start = Date.now();
  try {
    let timerId: NodeJS.Timeout | null = null;
    await Promise.race([
      redis.ping(),
      new Promise<never>((_, reject) => {
        timerId = setTimeout(() => reject(new Error("Redis ping timed out (>2000ms)")), 2000);
        if (timerId && typeof timerId === "object" && "unref" in timerId) timerId.unref();
      }),
    ]);
    if (timerId) clearTimeout(timerId);
    const latencyMs = Date.now() - start;
    recordRedisSuccess();
    return { success: true, latencyMs };
  } catch (err) {
    recordRedisFailure(err);
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, latencyMs: Date.now() - start, error: msg };
  }
}

export function getRedisStatus(): RedisStatus {
  const mode = getRedisMode();
  const isBreakerOpen = isCircuitBreakerOpen();

  let health: RedisHealth = "healthy";
  if (mode === "fallback_only") {
    health = "offline";
  } else if (!isRedisConfigured && !isTestEnv()) {
    health = "offline";
  } else if (isBreakerOpen) {
    health = consecutiveFailures > 2 ? "offline" : "degraded";
  }

  return {
    mode,
    health,
    isConfigured: isRedisConfigured,
    consecutiveFailures,
    lastFailureTime: redisFailureTimestamp,
    cooldownMs: getRedisCooldownMs(),
    isCircuitBreakerOpen: isBreakerOpen,
  };
}

export function resetRedisBreaker(): void {
  redisFailureTimestamp = 0;
  consecutiveFailures = 0;
  lastWarnTimestamp = 0;
  clearRedisModeCache();
}
