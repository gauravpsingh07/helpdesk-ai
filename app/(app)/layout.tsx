import type { ReactNode } from 'react';
import Link from 'next/link';
import { requireActor } from '@/lib/auth/session';
import { signOutAction } from '@/lib/actions/auth';
import { prisma } from '@/lib/db/client';
import type { Role } from '@/lib/auth/rbac';

const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'AGENT', 'CUSTOMER'] },
  { href: '/tickets', label: 'Tickets', roles: ['ADMIN', 'AGENT', 'CUSTOMER'] },
  { href: '/knowledge', label: 'Knowledge base', roles: ['ADMIN', 'AGENT'] },
  { href: '/metrics', label: 'AI metrics', roles: ['ADMIN', 'AGENT'] },
  { href: '/settings', label: 'Settings', roles: ['ADMIN'] },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const actor = await requireActor();
  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
    select: { name: true },
  });
  const links = NAV.filter((n) => n.roles.includes(actor.role));

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white p-4">
        <div className="px-2 py-3">
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Workspace</p>
          <p className="truncate text-sm font-semibold">{tenant?.name ?? 'Helpdesk'}</p>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-200 pt-3">
          <p className="truncate px-2 text-sm font-medium">{actor.name}</p>
          <p className="px-2 text-xs text-slate-400 capitalize">{actor.role.toLowerCase()}</p>
          <form action={signOutAction} className="mt-2">
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
