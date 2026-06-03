'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireActor } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { audit } from '@/lib/audit';
import { publishTicketEvent } from '@/lib/realtime';
import { createTicketSchema, postMessageSchema, ticketStatusSchema } from '@/lib/validation/ticket';

function senderFor(role: string): 'CUSTOMER' | 'AGENT' {
  return role === 'CUSTOMER' ? 'CUSTOMER' : 'AGENT';
}

export async function createTicketAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const actor = await requireActor();
  const parsed = createTicketSchema.safeParse({
    subject: formData.get('subject'),
    body: formData.get('body'),
    priority: formData.get('priority') ?? undefined,
  });
  if (!parsed.success) return 'Please provide a subject (3+ chars) and a message.';

  const db = getTenantDb(actor.tenantId);
  const ticket = await db.ticket.create({
    data: {
      tenantId: actor.tenantId,
      subject: parsed.data.subject,
      priority: parsed.data.priority,
      tags: parsed.data.tags,
      createdById: actor.userId,
    },
  });
  await db.message.create({
    data: {
      tenantId: actor.tenantId,
      ticketId: ticket.id,
      authorId: actor.userId,
      sender: senderFor(actor.role),
      body: parsed.data.body,
    },
  });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    action: 'ticket.create',
    target: ticket.id,
  });

  redirect(`/tickets/${ticket.id}`);
}

export async function postMessageAction(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const actor = await requireActor();
  const ticketId = String(formData.get('ticketId') ?? '');
  const parsed = postMessageSchema.safeParse({ body: formData.get('body') });
  if (!ticketId || !parsed.success) return 'Message cannot be empty.';

  const db = getTenantDb(actor.tenantId);
  const ticket = await db.ticket.findFirst({ where: { id: ticketId } });
  if (!ticket) return 'Ticket not found.';

  const sender = senderFor(actor.role);
  const message = await db.message.create({
    data: {
      tenantId: actor.tenantId,
      ticketId,
      authorId: actor.userId,
      sender,
      body: parsed.data.body,
    },
  });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    action: 'message.create',
    target: ticketId,
  });
  publishTicketEvent(actor.tenantId, {
    type: 'message',
    ticketId,
    data: {
      id: message.id,
      body: message.body,
      sender,
      authorName: actor.name,
      createdAt: message.createdAt.toISOString(),
    },
  });

  revalidatePath(`/tickets/${ticketId}`);
  return undefined;
}

export async function setStatusAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const ticketId = String(formData.get('ticketId') ?? '');
  const parsed = ticketStatusSchema.safeParse(formData.get('status'));
  if (!ticketId || !parsed.success) return;

  const db = getTenantDb(actor.tenantId);
  await db.ticket.update({ where: { id: ticketId }, data: { status: parsed.data } });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    action: 'ticket.status',
    target: ticketId,
    metadata: { status: parsed.data },
  });
  publishTicketEvent(actor.tenantId, { type: 'status', ticketId, data: { status: parsed.data } });
  revalidatePath(`/tickets/${ticketId}`);
}

export async function assignTicketAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  if (actor.role === 'CUSTOMER') return;

  const ticketId = String(formData.get('ticketId') ?? '');
  const assigneeId = String(formData.get('assigneeId') ?? '') || null;
  if (!ticketId) return;

  const db = getTenantDb(actor.tenantId);
  await db.ticket.update({ where: { id: ticketId }, data: { assigneeId } });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    action: 'ticket.assign',
    target: ticketId,
    metadata: { assigneeId },
  });
  publishTicketEvent(actor.tenantId, { type: 'assignee', ticketId, data: { assigneeId } });
  revalidatePath(`/tickets/${ticketId}`);
}
