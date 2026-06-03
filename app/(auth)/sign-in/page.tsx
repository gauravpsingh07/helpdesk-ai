'use client';

import { useActionState } from 'react';
import { signInAction } from '@/lib/actions/auth';

export default function SignInPage() {
  const [error, formAction, pending] = useActionState(signInAction, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">Helpdesk AI</h1>
          <p className="text-sm text-slate-500">Sign in to your workspace</p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">
          Demo: <span className="font-mono">admin@acme.test</span> /{' '}
          <span className="font-mono">Password123!</span>
        </p>
      </form>
    </main>
  );
}
