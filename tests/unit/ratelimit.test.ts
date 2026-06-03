import { beforeEach, describe, expect, it } from 'vitest';
import { __resetRateLimits, rateLimit } from '@/lib/ratelimit/tokenBucket';

describe('token-bucket rate limiter', () => {
  beforeEach(() => __resetRateLimits());

  it('allows up to the limit, then blocks with a retry-after', () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimit('client-a', 5).allowed).toBe(true);
    }
    const blocked = rateLimit('client-a', 5);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('tracks buckets independently per key', () => {
    expect(rateLimit('a', 1).allowed).toBe(true);
    expect(rateLimit('a', 1).allowed).toBe(false);
    expect(rateLimit('b', 1).allowed).toBe(true);
  });
});
