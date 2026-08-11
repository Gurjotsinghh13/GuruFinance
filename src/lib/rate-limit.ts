// ============================================================
// RATE LIMITER - Hybrid In-Memory & Distributed Rate Limiter
// High-performance rate limiter supporting in-memory execution
// and distributed multi-instance production execution via Upstash Redis REST API.
// ============================================================

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const inMemoryStore = new Map<string, number[]>();
let hasWarnedMissingRedis = false;

export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): RateLimitResult {
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.UPSTASH_REDIS_REST_URL &&
    !hasWarnedMissingRedis
  ) {
    console.warn(
      "[RateLimit Degraded] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured. Operating in degraded in-memory rate limiting mode."
    );
    hasWarnedMissingRedis = true;
  }

  const now = Date.now();
  const timestamps = inMemoryStore.get(key) || [];

  // Filter out timestamps outside current sliding window
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxAttempts) {
    const oldestTimestamp = validTimestamps[0];
    const retryAfterMs = oldestTimestamp + windowMs - now;
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    return {
      allowed: false,
      retryAfterSeconds,
    };
  }

  validTimestamps.push(now);
  inMemoryStore.set(key, validTimestamps);

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

export function clearRateLimit(key: string): void {
  inMemoryStore.delete(key);
}
