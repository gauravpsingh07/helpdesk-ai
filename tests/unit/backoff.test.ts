import { describe, expect, it } from 'vitest';
import { backoffSeconds } from '@/lib/jobs/backoff';

describe('backoffSeconds', () => {
  it('grows exponentially', () => {
    expect(backoffSeconds(1)).toBe(10);
    expect(backoffSeconds(2)).toBe(20);
    expect(backoffSeconds(3)).toBe(40);
  });

  it('caps at 300 seconds', () => {
    expect(backoffSeconds(10)).toBe(300);
  });
});
