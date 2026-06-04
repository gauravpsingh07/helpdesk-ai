import { describe, expect, it } from 'vitest';
import { keywordRecall, mean, retrievalHit } from '@/lib/eval/scorer';

describe('eval scorer', () => {
  it('keywordRecall is the fraction of keywords present', () => {
    expect(keywordRecall('refund within 30 days', ['30'])).toBe(1);
    expect(keywordRecall('Reset your PASSWORD here', ['password'])).toBe(1);
    expect(keywordRecall('no match', ['alpha', 'beta'])).toBe(0);
    expect(keywordRecall('only alpha', ['alpha', 'beta'])).toBe(0.5);
  });

  it('retrievalHit checks the expected title', () => {
    expect(retrievalHit(['Refund policy', 'Shipping'], 'Refund policy')).toBe(true);
    expect(retrievalHit(['Shipping'], 'Refund policy')).toBe(false);
  });

  it('mean handles empty input', () => {
    expect(mean([])).toBe(0);
    expect(mean([1, 2, 3])).toBe(2);
  });
});
