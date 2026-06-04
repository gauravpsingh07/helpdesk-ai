import { redirect } from 'next/navigation';
import { getCurrentActor } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

type AggRow = {
  total: number;
  refused: number;
  accepted: number;
  edited: number;
  rejected: number;
  pending: number;
  avg_faithfulness: number;
  total_cost: number;
  p95_latency: number;
  total_tokens: number;
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default async function MetricsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect('/sign-in');
  if (actor.role === 'CUSTOMER') redirect('/dashboard');

  const rows = await prisma.$queryRaw<AggRow[]>`
    SELECT
      count(*)::int AS total,
      (count(*) FILTER (WHERE refused))::int AS refused,
      (count(*) FILTER (WHERE status = 'ACCEPTED'))::int AS accepted,
      (count(*) FILTER (WHERE status = 'EDITED'))::int AS edited,
      (count(*) FILTER (WHERE status = 'REJECTED'))::int AS rejected,
      (count(*) FILTER (WHERE status = 'PENDING'))::int AS pending,
      coalesce(avg(faithfulness), 0)::float8 AS avg_faithfulness,
      coalesce(sum("costUsd"), 0)::float8 AS total_cost,
      coalesce(percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs"), 0)::float8 AS p95_latency,
      coalesce(sum("promptTokens" + "completionTokens"), 0)::int AS total_tokens
    FROM "AiSuggestion"
    WHERE "tenantId" = ${actor.tenantId}
  `;

  const m =
    rows[0] ??
    ({
      total: 0,
      refused: 0,
      accepted: 0,
      edited: 0,
      rejected: 0,
      pending: 0,
      avg_faithfulness: 0,
      total_cost: 0,
      p95_latency: 0,
      total_tokens: 0,
    } satisfies AggRow);

  const sent = m.accepted + m.edited;
  const resolved = sent + m.rejected;
  const acceptanceRate = resolved ? sent / resolved : 0;
  const refusalRate = m.total ? m.refused / m.total : 0;

  const stats = [
    { label: 'AI suggestions', value: String(m.total) },
    {
      label: 'Acceptance rate',
      value: pct(acceptanceRate),
      hint: `${sent} sent / ${resolved} resolved`,
    },
    { label: 'Refusal rate', value: pct(refusalRate), hint: `${m.refused} escalated` },
    { label: 'Avg faithfulness', value: pct(m.avg_faithfulness) },
    { label: 'p95 latency', value: `${Math.round(m.p95_latency)} ms` },
    {
      label: 'Est. AI cost',
      value: `$${m.total_cost.toFixed(4)}`,
      hint: `${m.total_tokens} tokens`,
    },
  ];

  const breakdown = [
    { label: 'Accepted', value: m.accepted },
    { label: 'Edited', value: m.edited },
    { label: 'Rejected', value: m.rejected },
    { label: 'Pending', value: m.pending },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI metrics</h1>
        <p className="text-sm text-slate-500">
          Observability for every AI suggestion: quality, cost, latency, and human decisions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
            {s.hint && <p className="mt-1 text-xs text-slate-400">{s.hint}</p>}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-slate-500">Human decisions</h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          {breakdown.map((b) => (
            <div key={b.label} className="rounded-lg bg-slate-50 p-3">
              <p className="text-xl font-semibold">{b.value}</p>
              <p className="text-xs text-slate-400">{b.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
