import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { getUserEmailMap } from '@/lib/admin/userDirectory'
import { AdminUnavailable } from '../Unavailable'

export default async function AdminAuditPage() {
  if (!isAdminClientConfigured()) return <AdminUnavailable />

  const admin = createAdminClient()!
  const [{ data, error }, emails] = await Promise.all([
    admin
      .from('platform_audit_events')
      .select('id, actor_id, action, target_type, target_id, environment, result, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    getUserEmailMap(admin),
  ])

  if (error) return <AdminUnavailable reason={error.message} />

  const events = (data ?? []) as {
    id: string; actor_id: string | null; action: string; target_type: string | null
    target_id: string | null; environment: string; result: string; created_at: string
  }[]

  if (events.length === 0) {
    return <p className="text-sm text-neutral-500">No audit events recorded yet.</p>
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2">Actor</th>
            <th className="px-3 py-2">Action</th>
            <th className="px-3 py-2">Target</th>
            <th className="px-3 py-2">Environment</th>
            <th className="px-3 py-2">Result</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="px-3 py-2 text-neutral-500">{e.created_at}</td>
              <td className="px-3 py-2">{e.actor_id ? emails.get(e.actor_id) ?? e.actor_id : '—'}</td>
              <td className="px-3 py-2">{e.action}</td>
              <td className="px-3 py-2">{e.target_type ? `${e.target_type}:${e.target_id}` : '—'}</td>
              <td className="px-3 py-2">{e.environment}</td>
              <td className="px-3 py-2 capitalize">{e.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
