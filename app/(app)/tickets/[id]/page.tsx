import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireActor } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { setStatusAction, assignTicketAction } from '@/lib/actions/tickets';
import { generateReplyAction, triageTicketAction } from '@/lib/actions/agent';
import { TicketThread, type ThreadMessage } from './ticket-thread';
import { SuggestionPanel, type PendingSuggestion } from './suggestion-panel';

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const db = getTenantDb(actor.tenantId);

  const ticket = await db.ticket.findFirst({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      assignee: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { name: true } } },
      },
    },
  });

  if (!ticket) notFound();
  if (actor.role === 'CUSTOMER' && ticket.createdById !== actor.userId) notFound();

  const isStaff = actor.role !== 'CUSTOMER';
  const agents = isStaff
    ? await db.user.findMany({
        where: { role: { in: ['ADMIN', 'AGENT'] } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : [];

  const pendingSuggestion = isStaff
    ? await db.aiSuggestion.findFirst({
        where: { ticketId: ticket.id, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      })
    : null;
  const suggestionForPanel: PendingSuggestion | null = pendingSuggestion
    ? {
        id: pendingSuggestion.id,
        draft: pendingSuggestion.draft,
        faithfulness: pendingSuggestion.faithfulness,
        refused: pendingSuggestion.refused,
        citations:
          (pendingSuggestion.citations as unknown as { n: number; documentTitle: string }[]) ?? [],
      }
    : null;

  const initialMessages: ThreadMessage[] = ticket.messages.map((m) => ({
    id: m.id,
    body: m.body,
    sender: m.sender,
    authorName: m.sender === 'AI' ? 'AI Assistant' : (m.author?.name ?? 'Unknown'),
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/tickets" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to tickets
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{ticket.subject}</h1>
        <p className="text-sm text-slate-500">
          Opened by {ticket.createdBy.name} · Priority P{ticket.priority}
        </p>
        {ticket.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ticket.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {isStaff && (
        <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <form action={setStatusAction} className="flex items-end gap-2">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <label className="space-y-1">
              <span className="block text-xs text-slate-400">Status</span>
              <select
                name="status"
                defaultValue={ticket.status}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="OPEN">Open</option>
                <option value="PENDING">Pending</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </label>
            <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
              Update
            </button>
          </form>

          <form action={assignTicketAction} className="flex items-end gap-2">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <label className="space-y-1">
              <span className="block text-xs text-slate-400">Assignee</span>
              <select
                name="assigneeId"
                defaultValue={ticket.assignee?.id ?? ''}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
              Assign
            </button>
          </form>

          <form action={generateReplyAction} className="flex items-end">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <button className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700">
              Draft AI reply
            </button>
          </form>

          <form action={triageTicketAction} className="flex items-end">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Auto-triage
            </button>
          </form>
        </div>
      )}

      {suggestionForPanel && <SuggestionPanel suggestion={suggestionForPanel} />}

      <TicketThread ticketId={ticket.id} initialMessages={initialMessages} />
    </div>
  );
}
