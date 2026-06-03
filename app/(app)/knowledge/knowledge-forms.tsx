'use client';

import { useActionState } from 'react';
import {
  createDocumentAction,
  searchKnowledgeAction,
  type SearchState,
} from '@/lib/actions/documents';

export function AddDocumentForm() {
  const [error, action, pending] = useActionState(createDocumentAction, undefined);
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-medium text-slate-700">Add a document</h2>
      <input
        name="title"
        required
        placeholder="Title (e.g. Refund policy)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      <textarea
        name="content"
        required
        rows={6}
        placeholder="Paste the document text. It will be chunked, embedded, and indexed for retrieval."
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? 'Indexing…' : 'Add & index'}
      </button>
    </form>
  );
}

export function KnowledgeSearch() {
  const [state, action, pending] = useActionState<SearchState, FormData>(
    searchKnowledgeAction,
    undefined,
  );
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-medium text-slate-700">Test retrieval</h2>
      <form action={action} className="flex gap-2">
        <input
          name="query"
          required
          placeholder="Ask the knowledge base…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? 'Searching…' : 'Search'}
        </button>
      </form>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state && !state.error && state.results.length === 0 && (
        <p className="text-sm text-slate-400">No matching chunks.</p>
      )}
      {state && state.results.length > 0 && (
        <ul className="space-y-2">
          {state.results.map((r) => (
            <li key={r.id} className="rounded-lg bg-slate-50 p-3">
              <div className="mb-1 text-xs text-slate-400">
                {r.documentTitle} · score {r.score.toFixed(3)}
              </div>
              <div className="text-sm text-slate-700">{r.content.slice(0, 240)}…</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
