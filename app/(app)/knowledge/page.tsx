import { redirect } from 'next/navigation';
import { getCurrentActor } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { deleteDocumentAction } from '@/lib/actions/documents';
import { AddDocumentForm, KnowledgeSearch } from './knowledge-forms';

const STATUS_STYLES: Record<string, string> = {
  INDEXED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default async function KnowledgePage() {
  const actor = await getCurrentActor();
  if (!actor) redirect('/sign-in');
  if (actor.role === 'CUSTOMER') redirect('/dashboard');

  const db = getTenantDb(actor.tenantId);
  const docs = await db.document.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { chunks: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Knowledge base</h1>
        <p className="text-sm text-slate-500">
          Documents are chunked, embedded, and used to ground AI replies.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AddDocumentForm />
        <KnowledgeSearch />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-sm font-medium text-slate-500">Documents ({docs.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-400 uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Chunks</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  No documents yet — add one above.
                </td>
              </tr>
            )}
            {docs.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{d.title}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[d.status]}`}
                  >
                    {d.status.toLowerCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{d._count.chunks}</td>
                <td className="px-4 py-3 text-right">
                  <form action={deleteDocumentAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="text-xs font-medium text-red-600 hover:underline">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
