import Link from 'next/link'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { getUserEmailMap } from '@/lib/admin/userDirectory'
import { PLATFORM_PRODUCTS } from '@/lib/products/registry'
import { computeEnvironmentHealth } from '@/lib/admin/environment'
import { computeEmailDiagnostics } from '@/lib/admin/emailDiagnostics'
import { computeAuthDiagnostics } from '@/lib/admin/authDiagnostics'

async function getUserTotal(): Promise<string> {
  if (!isAdminClientConfigured()) return 'unknown (service role not configured)'
  const admin = createAdminClient()
  if (!admin) return 'unknown (service role not configured)'
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error || !data) return 'unknown (lookup failed)'
  return data.users.length < 1000 ? String(data.users.length) : '1000+'
}

async function getOrganizationTotal(): Promise<string> {
  if (!isAdminClientConfigured()) return 'unknown (service role not configured)'
  const admin = createAdminClient()
  if (!admin) return 'unknown (service role not configured)'
  const { count, error } = await admin.from('organizations').select('id', { count: 'exact', head: true })
  if (error || count === null) return 'unknown (lookup failed)'
  return String(count)
}

type SupabaseHealth = 'reachable' | 'unreachable' | 'not_configured'

async function getSupabaseHealth(): Promise<SupabaseHealth> {
  if (!isAdminClientConfigured()) return 'not_configured'
  const admin = createAdminClient()
  if (!admin) return 'not_configured'
  const { error } = await admin.from('organizations').select('id', { count: 'exact', head: true })
  return error ? 'unreachable' : 'reachable'
}

interface RecentAuditEvent {
  id: string
  actor_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  result: string
  created_at: string
}

async function getRecentAuditEvents(): Promise<{ events: RecentAuditEvent[]; emails: Map<string, string> } | null> {
  if (!isAdminClientConfigured()) return null
  const admin = createAdminClient()
  if (!admin) return null
  const [{ data, error }, emails] = await Promise.all([
    admin
      .from('platform_audit_events')
      .select('id, actor_id, action, target_type, target_id, result, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    getUserEmailMap(admin),
  ])
  if (error || !data) return null
  return { events: data as RecentAuditEvent[], emails }
}

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {detail && <div className="mt-1 text-xs text-neutral-500">{detail}</div>}
    </div>
  )
}

export default async function AdminDashboardPage() {
  const [userTotal, orgTotal, supabaseHealth, recentAudit] = await Promise.all([
    getUserTotal(),
    getOrganizationTotal(),
    getSupabaseHealth(),
    getRecentAuditEvents(),
  ])
  const env = computeEnvironmentHealth(process.env)
  const email = computeEmailDiagnostics(process.env)
  const auth = computeAuthDiagnostics(process.env)

  const liveProducts = PLATFORM_PRODUCTS.filter((p) => p.availability === 'live').length

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={userTotal} />
        <StatCard label="Organizations" value={orgTotal} />
        <StatCard label="Products" value={`${liveProducts} / ${PLATFORM_PRODUCTS.length} live`} detail="See /admin/products for detail" />
        <StatCard
          label="Auth"
          value={auth.supabaseUrl === 'configured' && auth.supabaseAnonKey === 'configured' ? 'configured' : 'misconfigured'}
          detail="Supabase URL + anon key presence"
        />
        <StatCard
          label="Email"
          value={email.resendApiKey === 'configured' ? 'configured' : 'not configured'}
          detail={email.emailSendingEnabled ? 'Sending enabled' : 'Sending disabled (feature flag off)'}
        />
        <StatCard
          label="Supabase"
          value={supabaseHealth === 'not_configured' ? 'not configured' : supabaseHealth}
          detail="Live query against organizations table, service-role client"
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Environment health</h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th scope="col" className="px-3 py-2">Environment</th>
                <th scope="col" className="px-3 py-2">State</th>
                <th scope="col" className="px-3 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {env.map((e) => (
                <tr key={e.name} className="border-t">
                  <td className="px-3 py-2 font-medium capitalize">{e.name}</td>
                  <td className="px-3 py-2 capitalize">{e.state}</td>
                  <td className="px-3 py-2 text-neutral-500">{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">Recent audit events</h2>
          <Link href="/admin/audit" className="text-xs underline">
            View all
          </Link>
        </div>
        {recentAudit === null ? (
          <p className="text-sm text-neutral-500">Unavailable in this environment: SUPABASE_SERVICE_ROLE_KEY is not configured.</p>
        ) : recentAudit.events.length === 0 ? (
          <p className="text-sm text-neutral-500">No audit events recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th scope="col" className="px-3 py-2">Time</th>
                  <th scope="col" className="px-3 py-2">Actor</th>
                  <th scope="col" className="px-3 py-2">Action</th>
                  <th scope="col" className="px-3 py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {recentAudit.events.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="px-3 py-2 text-neutral-500">{e.created_at}</td>
                    <td className="px-3 py-2">{e.actor_id ? recentAudit.emails.get(e.actor_id) ?? e.actor_id : '—'}</td>
                    <td className="px-3 py-2">{e.action}</td>
                    <td className="px-3 py-2 capitalize">{e.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
