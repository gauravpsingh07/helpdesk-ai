import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import type { Role } from './rbac';
import { assertRole } from './rbac';

export type Actor = {
  userId: string;
  tenantId: string;
  role: Role;
  email: string;
  name: string;
};

/** Returns the current actor, or null if not signed in. */
export async function getCurrentActor(): Promise<Actor | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    role: session.user.role,
    email: session.user.email ?? '',
    name: session.user.name ?? '',
  };
}

/** Returns the current actor or redirects to the sign-in page. */
export async function requireActor(): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) redirect('/sign-in');
  return actor;
}

/** Returns the current actor or throws/redirects if their role isn't allowed. */
export async function requireRole(allowed: readonly Role[]): Promise<Actor> {
  const actor = await requireActor();
  assertRole(actor.role, allowed);
  return actor;
}
