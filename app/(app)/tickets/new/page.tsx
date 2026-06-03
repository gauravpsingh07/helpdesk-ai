'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { createTicketAction } from '@/lib/actions/tickets';

export default function NewTicketPage() {
  const [error, formAction, pending] = useActionState(createTicketAction, undefined);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/tickets" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to tickets
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New ticket</h1>
      </div>

      <form
        action={formAction}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Subject</span>
          <input
            name="subject"
            required
            minLength={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Priority</span>
          <select
            name="priority"
            defaultValue="3"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="1">1 — Urgent</option>
            <option value="2">2 — High</option>
            <option value="3">3 — Normal</option>
            <option value="4">4 — Low</option>
            <option value="5">5 — Lowest</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Message</span>
          <textarea
            name="body"
            required
            rows={5}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create ticket'}
        </button>
      </form>
    </div>
  );
}
