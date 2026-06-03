'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { audit } from '@/lib/audit';
import { publishTicketEvent } from '@/lib/realtime';
import { runReplyAgent } from '@/lib/agent/replyAgent';
import { runTriageAgent } from '@/lib/agent/triageAgent';

export async function generateReplyAction(formData: FormData): Promise<void> {
  const actor = await requireRole(['ADMIN', 'AGENT']);
  const ticketId = String(formData.get('ticketId') ?? '');
  if (!ticketId) return;

  const result = await runReplyAgent(actor.tenantId, ticketId);
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    action: 'ai.reply.generate',
    target: ticketId,
    metadata: {
      suggestionId: result.suggestionId,
      refused: result.refused,
      faithfulness: result.faithfulness,
    },
  });
  revalidatePath(`/tickets/${ticketId}`);
}

export async function resolveSuggestionAction(formData: FormData): Promise<void> {
  const actor = await requireRole(['ADMIN', 'AGENT']);
  const suggestionId = String(formData.get('suggestionId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const edited = String(formData.get('body') ?? '').trim();
  if (!suggestionId || !['accept', 'edit', 'reject'].includes(decision)) return;

  const db = getTenantDb(actor.tenantId);
  const suggestion = await db.aiSuggestion.findFirst({ where: { id: suggestionId } });
  if (!suggestion || suggestion.status !== 'PENDING') return;

  if (decision === 'reject') {
    await db.aiSuggestion.update({ where: { id: suggestionId }, data: { status: 'REJECTED' } });
    await audit({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      action: 'ai.reply.reject',
      target: suggestion.ticketId,
    });
  } else {
    const body = decision === 'edit' && edited ? edited : suggestion.draft;
    const message = await db.message.create({
      data: {
        tenantId: actor.tenantId,
        ticketId: suggestion.ticketId,
        authorId: actor.userId,
        sender: 'AI',
        body,
      },
    });
    await db.aiSuggestion.update({
      where: { id: suggestionId },
      data: { status: decision === 'edit' ? 'EDITED' : 'ACCEPTED' },
    });
    await audit({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      action: `ai.reply.${decision}`,
      target: suggestion.ticketId,
    });
    publishTicketEvent(actor.tenantId, {
      type: 'message',
      ticketId: suggestion.ticketId,
      data: {
        id: message.id,
        body: message.body,
        sender: 'AI',
        authorName: 'AI Assistant',
        createdAt: message.createdAt.toISOString(),
      },
    });
  }
  revalidatePath(`/tickets/${suggestion.ticketId}`);
}

export async function triageTicketAction(formData: FormData): Promise<void> {
  const actor = await requireRole(['ADMIN', 'AGENT']);
  const ticketId = String(formData.get('ticketId') ?? '');
  if (!ticketId) return;

  const db = getTenantDb(actor.tenantId);
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
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    action: 'ticket.triage',
    target: ticketId,
    metadata: { tags: triage.tags, priority: triage.priority },
  });
  revalidatePath(`/tickets/${ticketId}`);
}
