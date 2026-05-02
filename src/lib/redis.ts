import { Redis } from "@upstash/redis";

// Validation to catch the common "redis://" vs "https://" error early
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;

if (redisUrl && redisUrl.startsWith("redis://")) {
  console.error("CRITICAL ERROR: Your UPSTASH_REDIS_REST_URL starts with 'redis://'. For serverless, you MUST use the HTTPS REST URL from the 'REST API' section of the Upstash console.");
}

export const redis = new Redis({
  url: redisUrl!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const ROOM_TTL = 86400; // 24 hours
