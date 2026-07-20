import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { AdminUnavailable } from '../Unavailable'

export default async function AdminOrganizationsPage() {
  if (!isAdminClientConfigured()) return <AdminUnavailable />

  const admin = createAdminClient()!
  const { data, error } = await admin
    .from('organizations')
    .select('id, name, created_at, organization_members(count)')
    .order('created_at', { ascending: false })

  if (error) return <AdminUnavailable reason={error.message} />

  const orgs = (data ?? []) as { id: string; name: string; created_at: string; organization_members: { count: number }[] }[]

  if (orgs.length === 0) {
    return <p className="text-sm text-neutral-500">No organizations exist yet.</p>
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Members</th>
            <th className="px-3 py-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((org) => (
            <tr key={org.id} className="border-t">
              <td className="px-3 py-2 font-medium">{org.name}</td>
              <td className="px-3 py-2">{org.organization_members?.[0]?.count ?? 0}</td>
              <td className="px-3 py-2 text-neutral-500">{org.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
