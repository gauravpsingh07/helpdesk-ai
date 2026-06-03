import type { NextRequest } from 'next/server';
import { getCurrentActor } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { subscribeTicket } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const actor = await getCurrentActor();
  if (!actor) return new Response('Unauthorized', { status: 401 });

  const { ticketId } = await params;
  const db = getTenantDb(actor.tenantId);
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId },
    select: { id: true, createdById: true },
  });
  if (!ticket) return new Response('Not found', { status: 404 });
  if (actor.role === 'CUSTOMER' && ticket.createdById !== actor.userId) {
    return new Response('Forbidden', { status: 403 });
  }

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let ping: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      send({ type: 'ready', ticketId });
      unsubscribe = subscribeTicket(actor.tenantId, ticketId, (event) => send(event));
      ping = setInterval(() => controller.enqueue(encoder.encode(': ping\n\n')), 25_000);
    },
    cancel() {
      clearInterval(ping);
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
