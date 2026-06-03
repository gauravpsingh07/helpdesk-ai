import { describe, expect, it } from 'vitest';
import { assertRole, canAccess, ForbiddenError, hasAtLeast } from '@/lib/auth/rbac';

describe('rbac', () => {
  it('canAccess respects the allow-list', () => {
    expect(canAccess('ADMIN', ['ADMIN'])).toBe(true);
    expect(canAccess('AGENT', ['ADMIN'])).toBe(false);
    expect(canAccess('CUSTOMER', ['AGENT', 'CUSTOMER'])).toBe(true);
  });

  it('hasAtLeast respects the hierarchy', () => {
    expect(hasAtLeast('ADMIN', 'AGENT')).toBe(true);
    expect(hasAtLeast('AGENT', 'AGENT')).toBe(true);
    expect(hasAtLeast('CUSTOMER', 'AGENT')).toBe(false);
  });

  it('assertRole throws ForbiddenError when not permitted', () => {
    expect(() => assertRole('CUSTOMER', ['ADMIN', 'AGENT'])).toThrow(ForbiddenError);
    expect(() => assertRole('ADMIN', ['ADMIN'])).not.toThrow();
  });
});
