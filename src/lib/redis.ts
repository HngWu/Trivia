import { Redis } from "@upstash/redis";

// Validation to catch the common "redis://" vs "https://" error early
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (redisUrl && redisUrl.startsWith("redis://")) {
  console.error("CRITICAL ERROR: Your UPSTASH_REDIS_REST_URL starts with 'redis://'. For serverless, you MUST use the HTTPS REST URL from the 'REST API' section of the Upstash console.");
}

export const isRedisConfigured = Boolean(
  redisUrl &&
  redisToken &&
  !redisUrl.startsWith("redis://") &&
  redisUrl !== "https://placeholder-disabled.upstash.io"
);

export const redis = new Redis({
  url: isRedisConfigured ? redisUrl! : "https://placeholder-disabled.upstash.io",
  token: isRedisConfigured ? redisToken! : "placeholder-token",
});

export const ROOM_TTL = 86400; // 24 hours
