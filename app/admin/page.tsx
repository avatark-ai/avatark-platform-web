import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
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
  const userTotal = await getUserTotal()
  const env = computeEnvironmentHealth(process.env)
  const email = computeEmailDiagnostics(process.env)
  const auth = computeAuthDiagnostics(process.env)

  const liveProducts = PLATFORM_PRODUCTS.filter((p) => p.availability === 'live').length

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={userTotal} />
        <StatCard
          label="Product Registry"
          value={`${liveProducts} / ${PLATFORM_PRODUCTS.length} live`}
        />
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
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">Environment health</h2>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-3 py-2">Environment</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Detail</th>
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
    </div>
  )
}
