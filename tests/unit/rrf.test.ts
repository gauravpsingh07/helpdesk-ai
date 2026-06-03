import { describe, expect, it } from 'vitest';
import { reciprocalRankFusion } from '@/lib/rag/rrf';

describe('reciprocalRankFusion', () => {
  it('rewards items ranked highly across multiple lists', () => {
    const fused = reciprocalRankFusion([
      ['a', 'b', 'c'],
      ['b', 'a', 'd'],
    ]);
    // a and b are top in both lists; c and d appear once and lower.
    expect(fused.get('a') ?? 0).toBeGreaterThan(fused.get('c') ?? 0);
    expect(fused.get('b') ?? 0).toBeGreaterThan(fused.get('d') ?? 0);
  });

  it('ranks an item appearing in both lists above one appearing once', () => {
    const fused = reciprocalRankFusion([
      ['x', 'y'],
      ['x', 'z'],
    ]);
    expect(fused.get('x') ?? 0).toBeGreaterThan(fused.get('y') ?? 0);
  });
});
