import { EventEmitter } from 'node:events';

export type TicketEvent =
  | { type: 'message'; ticketId: string; data: TicketMessagePayload }
  | { type: 'status'; ticketId: string; data: { status: string } }
  | { type: 'assignee'; ticketId: string; data: { assigneeId: string | null } };

export type TicketMessagePayload = {
  id: string;
  body: string;
  sender: string;
  authorName: string;
  createdAt: string;
};

// Single in-process bus. Good for one instance / the demo; swap for Redis or
// Pusher pub/sub to fan out across multiple server instances.
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const channel = (tenantId: string, ticketId: string) => `t:${tenantId}:${ticketId}`;

export function publishTicketEvent(tenantId: string, event: TicketEvent): void {
  emitter.emit(channel(tenantId, event.ticketId), event);
}

export function subscribeTicket(
  tenantId: string,
  ticketId: string,
  listener: (event: TicketEvent) => void,
): () => void {
  const ch = channel(tenantId, ticketId);
  emitter.on(ch, listener);
  return () => {
    emitter.off(ch, listener);
  };
}
