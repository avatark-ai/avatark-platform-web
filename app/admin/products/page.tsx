import { PLATFORM_PRODUCTS, SUBSCRIPTION_MODEL_NOTE } from '@/lib/products/registry'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { checkProductHealth, type ProductHealth } from '@/lib/products/health'
import { summarizeProductAccess, type ProductAccessSummary } from '@/lib/products/access'

async function getAccessSummaries(): Promise<Map<string, ProductAccessSummary> | null> {
  if (!isAdminClientConfigured()) return null
  const admin = createAdminClient()
  if (!admin) return null
  const [{ data: grants, error: grantsError }, { data: roles, error: rolesError }] = await Promise.all([
    admin.from('product_access').select('user_id, product_id, status'),
    admin.from('platform_roles').select('user_id, role'),
  ])
  if (grantsError || rolesError || !grants || !roles) return null
  return summarizeProductAccess(grants, roles)
}

function HealthBadge({ health }: { health: ProductHealth }) {
  const color =
    health.state === 'reachable' ? 'text-green-700' : health.state === 'unreachable' ? 'text-red-600' : 'text-neutral-400'
  return (
    <span className={color} title={health.detail}>
      {health.state}
    </span>
  )
}

export default async function AdminProductsPage() {
  const [accessSummaries, healthResults] = await Promise.all([
    getAccessSummaries(),
    Promise.all(PLATFORM_PRODUCTS.map((p) => checkProductHealth(p.url))),
  ])
  const healthByProductId = new Map(PLATFORM_PRODUCTS.map((p, i) => [p.id, healthResults[i]]))

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th scope="col" className="px-3 py-2">Product</th>
              <th scope="col" className="px-3 py-2">URL</th>
              <th scope="col" className="px-3 py-2">Version</th>
              <th scope="col" className="px-3 py-2">Enabled</th>
              <th scope="col" className="px-3 py-2">Health</th>
              <th scope="col" className="px-3 py-2">Roles</th>
              <th scope="col" className="px-3 py-2">Subscription</th>
              <th scope="col" className="px-3 py-2">Account link</th>
              <th scope="col" className="px-3 py-2">Admin link</th>
              <th scope="col" className="px-3 py-2">Access grants</th>
            </tr>
          </thead>
          <tbody>
            {PLATFORM_PRODUCTS.map((p) => {
              const summary = accessSummaries?.get(p.id)
              const health = healthByProductId.get(p.id) ?? { state: 'unknown' as const, detail: 'Not checked.' }
              return (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2">
                    {p.url ? <a className="underline" href={p.url}>{p.url}</a> : <span className="text-neutral-400">unconfirmed</span>}
                  </td>
                  <td className="px-3 py-2 text-neutral-400">{p.version ?? 'unknown'}</td>
                  <td className="px-3 py-2">{p.availability === 'live' ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2"><HealthBadge health={health} /></td>
                  <td className="px-3 py-2 text-neutral-500">
                    {accessSummaries ? `${summary?.adminGrantees ?? 0} admin(s) with access` : 'unknown (service role not configured)'}
                  </td>
                  <td className="px-3 py-2 text-neutral-400">{SUBSCRIPTION_MODEL_NOTE}</td>
                  <td className="px-3 py-2">
                    <a className="underline" href={`/account?return=${encodeURIComponent(p.url ?? '/')}`}>avatark.ai/account</a>
                  </td>
                  <td className="px-3 py-2 text-neutral-500">{p.adminUrl ?? 'product-owned, not centrally tracked'}</td>
                  <td className="px-3 py-2">
                    {accessSummaries
                      ? `${summary?.activeGrants ?? 0} active / ${summary?.totalGrants ?? 0} total`
                      : 'unknown (service role not configured)'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500">
        Health is a live, point-in-time HTTP check performed when this page loads — not continuous uptime monitoring.
      </p>
    </div>
  )
}
