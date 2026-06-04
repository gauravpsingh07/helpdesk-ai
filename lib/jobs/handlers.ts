import { prisma } from '@/lib/db/client';
import { getTenantDb } from '@/lib/db/tenant';
import { ingestDocument } from '@/lib/rag/ingest';
import { runTriageAgent } from '@/lib/agent/triageAgent';
import { enqueue } from './queue';

type Handler = (payload: Record<string, unknown>) => Promise<void>;

const DAY_MS = 24 * 60 * 60 * 1000;

export const handlers: Record<string, Handler> = {
  'document.ingest': async (payload) => {
    const { tenantId, documentId, content } = payload as {
      tenantId: string;
      documentId: string;
      content: string;
    };
    await ingestDocument(tenantId, documentId, content);
  },

  'ticket.triage': async (payload) => {
    const { tenantId, ticketId } = payload as { tenantId: string; ticketId: string };
    const db = getTenantDb(tenantId);
    const ticket = await db.ticket.findFirst({
      where: { id: ticketId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    if (!ticket) return;
    const triage = await runTriageAgent(ticket.subject, ticket.messages[0]?.body ?? '');
    await db.ticket.update({
      where: { id: ticketId },
      data: { tags: triage.tags, priority: triage.priority },
    });
  },

  'digest.daily': async () => {
    const rows = await prisma.ticket.groupBy({
      by: ['tenantId'],
      where: { status: 'OPEN' },
      _count: { _all: true },
    });
    for (const row of rows) {
      console.log(`[digest] tenant ${row.tenantId}: ${row._count._all} open tickets`);
    }
    // Self-reschedule for tomorrow (cron-like, no external scheduler).
    await enqueue('digest.daily', {}, { runAt: new Date(Date.now() + DAY_MS) });
  },
};
