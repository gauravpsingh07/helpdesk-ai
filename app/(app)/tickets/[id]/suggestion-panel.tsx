'use client';

import { useState } from 'react';
import { resolveSuggestionAction } from '@/lib/actions/agent';

export type PendingSuggestion = {
  id: string;
  draft: string;
  faithfulness: number | null;
  refused: boolean;
  citations: { n: number; documentTitle: string }[];
};

export function SuggestionPanel({ suggestion }: { suggestion: PendingSuggestion }) {
  const [editing, setEditing] = useState(false);
  const pct = suggestion.faithfulness != null ? Math.round(suggestion.faithfulness * 100) : null;

  return (
    <div className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-violet-900">AI draft reply</h3>
        <div className="flex items-center gap-2 text-xs">
          {suggestion.refused && (
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-amber-800">escalated</span>
          )}
          {pct != null && <span className="text-violet-700">faithfulness {pct}%</span>}
        </div>
      </div>

      {editing ? (
        <form action={resolveSuggestionAction} className="space-y-2">
          <input type="hidden" name="suggestionId" value={suggestion.id} />
          <input type="hidden" name="decision" value="edit" />
          <textarea
            name="body"
            defaultValue={suggestion.draft}
            rows={6}
            className="w-full rounded-lg border border-violet-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white">
              Send edited
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-sm whitespace-pre-wrap text-slate-800">{suggestion.draft}</p>
          {suggestion.citations.length > 0 && (
            <p className="text-xs text-slate-500">
              Sources: {suggestion.citations.map((c) => `[${c.n}] ${c.documentTitle}`).join(' · ')}
            </p>
          )}
          <div className="flex gap-2">
            <form action={resolveSuggestionAction}>
              <input type="hidden" name="suggestionId" value={suggestion.id} />
              <input type="hidden" name="decision" value="accept" />
              <button className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white">
                Accept &amp; send
              </button>
            </form>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-violet-300 px-3 py-1.5 text-sm font-medium text-violet-700"
            >
              Edit
            </button>
            <form action={resolveSuggestionAction}>
              <input type="hidden" name="suggestionId" value={suggestion.id} />
              <input type="hidden" name="decision" value="reject" />
              <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Reject
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
