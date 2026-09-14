/**
 * @jest-environment node
 */
import {
  getRedisMode,
  setRedisMode,
  canAttemptRedis,
  isCircuitBreakerOpen,
  recordRedisFailure,
  recordRedisSuccess,
  resetRedisBreaker,
  safeRedisCall,
  safeRedisWrite,
  getRedisStatus,
} from "../src/lib/redis-breaker";
import { resetSqliteDbForTesting, closeSqliteDb } from "../src/lib/db/sqlite-connection";

jest.mock("../src/lib/redis", () => ({
  redis: {
    ping: jest.fn(),
  },
  isRedisConfigured: true,
}));

describe("Redis Breaker and Mode Switching", () => {
  beforeEach(() => {
    resetSqliteDbForTesting();
    resetRedisBreaker();
    setRedisMode("auto");
  });

  afterAll(() => {
    closeSqliteDb();
  });

  it("defaults to auto mode and allows Redis attempts when healthy", () => {
    expect(getRedisMode()).toBe("auto");
    expect(isCircuitBreakerOpen()).toBe(false);
    expect(canAttemptRedis()).toBe(true);
  });

  it("completely disables Redis attempts when switched to fallback_only mode", () => {
    setRedisMode("fallback_only");
    expect(getRedisMode()).toBe("fallback_only");
    expect(canAttemptRedis()).toBe(false);

    const status = getRedisStatus();
    expect(status.mode).toBe("fallback_only");
    expect(status.health).toBe("offline");
  });

  it("trips circuit breaker on failure in auto mode", () => {
    recordRedisFailure(new Error("Network connection error"));
    expect(isCircuitBreakerOpen()).toBe(true);
    expect(canAttemptRedis()).toBe(false);

    const status = getRedisStatus();
    expect(status.isCircuitBreakerOpen).toBe(true);
    expect(status.consecutiveFailures).toBe(1);

    // Resetting circuit breaker restores ability to attempt
    resetRedisBreaker();
    expect(isCircuitBreakerOpen()).toBe(false);
    expect(canAttemptRedis()).toBe(true);
  });

  it("safeRedisCall returns null immediately with 0ms delay when breaker is open", async () => {
    recordRedisFailure(new Error("Timeout"));

    const fn = jest.fn();
    const result = await safeRedisCall(fn);

    expect(result).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });

  it("safeRedisWrite returns false immediately without invoking operation when in fallback_only", async () => {
    setRedisMode("fallback_only");

    const writeFn = jest.fn();
    const result = await safeRedisWrite(writeFn);

    expect(result).toBe(false);
    expect(writeFn).not.toHaveBeenCalled();
  });

  it("recovers health status when recordRedisSuccess is called", () => {
    recordRedisFailure(new Error("Flaky network"));
    expect(isCircuitBreakerOpen()).toBe(true);

    recordRedisSuccess();
    expect(isCircuitBreakerOpen()).toBe(false);
    expect(canAttemptRedis()).toBe(true);
  });
});
