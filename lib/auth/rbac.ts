import type { Role } from '../generated/prisma/enums';

export type { Role };

const RANK: Record<Role, number> = {
  CUSTOMER: 0,
  AGENT: 1,
  ADMIN: 2,
};

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/** True if `role` appears in an explicit allow-list. */
export function canAccess(role: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(role);
}

/** True if `role` meets or exceeds `min` in the privilege hierarchy. */
export function hasAtLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}

/** Throws {@link ForbiddenError} if `role` is not in `allowed`. */
export function assertRole(role: Role, allowed: readonly Role[]): void {
  if (!canAccess(role, allowed)) {
    throw new ForbiddenError(
      `Role "${role}" is not permitted (need one of: ${allowed.join(', ')})`,
    );
  }
}
