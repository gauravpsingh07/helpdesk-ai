import { redirect } from 'next/navigation';
import { getCurrentActor } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { prisma } from '@/lib/db/client';

export default async function SettingsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect('/sign-in');
  // Defense in depth: the nav hides this for non-admins, and we enforce it here too.
  if (actor.role !== 'ADMIN') redirect('/dashboard');

  const db = getTenantDb(actor.tenantId);
  const [tenant, members] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: actor.tenantId } }),
    db.user.findMany({ orderBy: [{ role: 'asc' }, { name: 'asc' }] }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-500">Workspace and member administration.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-medium text-slate-500">Workspace</h2>
        <p className="mt-1 text-lg font-semibold">{tenant?.name}</p>
        <p className="text-xs text-slate-400">Plan: {tenant?.plan}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-sm font-medium text-slate-500">Members ({members.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-400 uppercase">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{m.name}</td>
                <td className="px-4 py-2 text-slate-500">{m.email}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize">
                    {m.role.toLowerCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
