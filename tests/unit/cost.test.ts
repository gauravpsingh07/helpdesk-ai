import { describe, expect, it } from 'vitest';
import { estimateCostUsd } from '@/lib/ai/cost';

describe('estimateCostUsd', () => {
  it('prices a known model by input/output tokens', () => {
    // 1M in @ $0.30 + 1M out @ $2.50 = $2.80
    expect(estimateCostUsd('gemini-2.5-flash', 1_000_000, 1_000_000)).toBeCloseTo(2.8, 5);
  });

  it('matches the most specific model id (flash-lite, not flash)', () => {
    // 1M out @ $0.40 for flash-lite
    expect(estimateCostUsd('gemini-2.5-flash-lite', 0, 1_000_000)).toBeCloseTo(0.4, 5);
  });

  it('returns 0 for unknown models', () => {
    expect(estimateCostUsd('mystery-model', 1_000_000, 1_000_000)).toBe(0);
  });
});
