type Bucket = { tokens: number; updatedAt: number };

// In-memory buckets. Fine for a single instance / demo; swap for Redis to scale out.
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

/**
 * Token-bucket limiter: `limitPerMin` tokens, refilled continuously. Each call
 * consumes one token. Returns whether the request is allowed and, if not, how
 * many seconds until a token is available.
 */
export function rateLimit(key: string, limitPerMin: number): RateLimitResult {
  const capacity = limitPerMin;
  const refillPerMs = limitPerMin / 60_000;
  const now = Date.now();

  const bucket = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
  const elapsed = now - bucket.updatedAt;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerMs);
  bucket.updatedAt = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterSec: 0 };
  }

  buckets.set(key, bucket);
  const retryAfterSec = Math.max(1, Math.ceil((1 - bucket.tokens) / (refillPerMs * 1000)));
  return { allowed: false, remaining: 0, retryAfterSec };
}

/** Test-only: clear all buckets. */
export function __resetRateLimits(): void {
  buckets.clear();
}
