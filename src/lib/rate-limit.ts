// ============================================================
// RATE LIMITER - Sliding Window In-Memory Protection
// High-performance, lightweight rate limiter for authentication endpoints.
// Note: For multi-instance/distributed production deployments,
// an external distributed store (e.g. Redis) is recommended.
// ============================================================

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const store = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): RateLimitResult {
  const now = Date.now();
  const timestamps = store.get(key) || [];

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
  store.set(key, validTimestamps);

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

export function clearRateLimit(key: string): void {
  store.delete(key);
}
