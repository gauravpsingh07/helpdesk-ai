import Link from 'next/link';
import { requireActor } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import type { TicketStatus } from '@/lib/generated/prisma/enums';

const FILTERS = ['ALL', 'OPEN', 'PENDING', 'RESOLVED'] as const;

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-slate-100 text-slate-600',
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await requireActor();
  const { status } = await searchParams;
  const active = FILTERS.includes((status ?? 'ALL') as (typeof FILTERS)[number])
    ? (status ?? 'ALL')
    : 'ALL';

  const db = getTenantDb(actor.tenantId);
  const where: { status?: TicketStatus; createdById?: string } = {};
  if (active !== 'ALL') where.status = active as TicketStatus;
  if (actor.role === 'CUSTOMER') where.createdById = actor.userId;

  const tickets = await db.ticket.findMany({
    where,
    orderBy: [{ status: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
    include: { assignee: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <Link
          href="/tickets/new"
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New ticket
        </Link>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === 'ALL' ? '/tickets' : `/tickets?status=${f}`}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              active === f
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {f.toLowerCase()}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-400 uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">Subject</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Priority</th>
              <th className="px-4 py-2 font-medium">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No tickets yet.
                </td>
              </tr>
            )}
            {tickets.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/tickets/${t.id}`} className="font-medium text-indigo-600">
                    {t.subject}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[t.status]}`}
                  >
                    {t.status.toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">P{t.priority}</td>
                <td className="px-4 py-3 text-slate-500">{t.assignee?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
