import { requireActor } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';

export default async function DashboardPage() {
  const actor = await requireActor();
  const db = getTenantDb(actor.tenantId);

  const [openTickets, totalTickets, docs] = await Promise.all([
    db.ticket.count({ where: { status: 'OPEN' } }),
    db.ticket.count(),
    db.document.count(),
  ]);

  const stats = [
    { label: 'Open tickets', value: openTickets },
    { label: 'Total tickets', value: totalTickets },
    { label: 'Knowledge docs', value: docs },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {actor.name.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500">
          Here&apos;s what&apos;s happening in your workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
