import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { getUserEmailMap } from '@/lib/admin/userDirectory'
import { AdminUnavailable } from '../Unavailable'

export default async function AdminRolesPage() {
  if (!isAdminClientConfigured()) return <AdminUnavailable />

  const admin = createAdminClient()!
  const [{ data: roles, error: rolesError }, { data: grants, error: grantsError }, emails] = await Promise.all([
    admin.from('platform_roles').select('user_id, role, granted_at').order('granted_at', { ascending: false }),
    admin.from('product_access').select('user_id, product_id, status, granted_at').order('granted_at', { ascending: false }),
    getUserEmailMap(admin),
  ])

  if (rolesError || grantsError) return <AdminUnavailable reason={rolesError?.message ?? grantsError?.message} />

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Platform roles</h2>
        {roles && roles.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr><th className="px-3 py-2">User</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Granted</th></tr>
              </thead>
              <tbody>
                {(roles as { user_id: string; role: string; granted_at: string }[]).map((r) => (
                  <tr key={`${r.user_id}-${r.role}`} className="border-t">
                    <td className="px-3 py-2">{emails.get(r.user_id) ?? r.user_id}</td>
                    <td className="px-3 py-2">{r.role}</td>
                    <td className="px-3 py-2 text-neutral-500">{r.granted_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No platform role grants exist yet.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Product access grants</h2>
        {grants && grants.length > 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr><th className="px-3 py-2">User</th><th className="px-3 py-2">Product</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Granted</th></tr>
              </thead>
              <tbody>
                {(grants as { user_id: string; product_id: string; status: string; granted_at: string }[]).map((g) => (
                  <tr key={`${g.user_id}-${g.product_id}`} className="border-t">
                    <td className="px-3 py-2">{emails.get(g.user_id) ?? g.user_id}</td>
                    <td className="px-3 py-2">{g.product_id}</td>
                    <td className="px-3 py-2">{g.status}</td>
                    <td className="px-3 py-2 text-neutral-500">{g.granted_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No product access grants exist yet.</p>
        )}
      </section>
    </div>
  )
}
