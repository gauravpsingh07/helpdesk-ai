'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { postMessageAction } from '@/lib/actions/tickets';

export type ThreadMessage = {
  id: string;
  body: string;
  sender: string;
  authorName: string;
  createdAt: string;
};

function Bubble({ m }: { m: ThreadMessage }) {
  const isAgent = m.sender === 'AGENT';
  const isAi = m.sender === 'AI';
  const align = isAgent || isAi ? 'items-end' : 'items-start';
  const tone = isAi
    ? 'bg-violet-100 text-violet-900'
    : isAgent
      ? 'bg-indigo-600 text-white'
      : 'bg-white text-slate-800 border border-slate-200';
  return (
    <div className={`flex flex-col ${align} gap-1`}>
      <span className="px-1 text-xs text-slate-400">
        {m.authorName}
        {isAi ? ' · AI' : ''}
      </span>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${tone}`}>
        {m.body}
      </div>
    </div>
  );
}

export function TicketThread({
  ticketId,
  initialMessages,
}: {
  ticketId: string;
  initialMessages: ThreadMessage[];
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [error, formAction, pending] = useActionState(postMessageAction, undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const es = new EventSource(`/api/stream/${ticketId}`);
    es.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data) as { type: string; data?: ThreadMessage };
        if (evt.type === 'message' && evt.data) {
          setMessages((prev) =>
            prev.some((m) => m.id === evt.data!.id) ? prev : [...prev, evt.data!],
          );
        }
      } catch {
        // ignore malformed frames (e.g. ready/ping)
      }
    };
    return () => es.close();
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!pending) formRef.current?.reset();
  }, [messages, pending]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto rounded-2xl bg-slate-50 p-4">
        {messages.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <form ref={formRef} action={formAction} className="space-y-2">
        <input type="hidden" name="ticketId" value={ticketId} />
        <textarea
          name="body"
          required
          rows={3}
          placeholder="Type a reply…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? 'Sending…' : 'Send reply'}
          </button>
        </div>
      </form>
    </div>
  );
}
