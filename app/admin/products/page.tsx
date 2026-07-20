import { PLATFORM_PRODUCTS } from '@/lib/products/registry'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'

async function getGrantCounts(): Promise<Map<string, number> | null> {
  if (!isAdminClientConfigured()) return null
  const admin = createAdminClient()
  if (!admin) return null
  const { data, error } = await admin.from('product_access').select('product_id')
  if (error || !data) return null
  const counts = new Map<string, number>()
  for (const row of data as { product_id: string }[]) {
    counts.set(row.product_id, (counts.get(row.product_id) ?? 0) + 1)
  }
  return counts
}

export default async function AdminProductsPage() {
  const grantCounts = await getGrantCounts()

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-3 py-2">Product</th>
            <th className="px-3 py-2">URL</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Account link</th>
            <th className="px-3 py-2">Admin link</th>
            <th className="px-3 py-2">Access grants</th>
          </tr>
        </thead>
        <tbody>
          {PLATFORM_PRODUCTS.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-3 py-2 font-medium">{p.name}</td>
              <td className="px-3 py-2">
                {p.url ? <a className="underline" href={p.url}>{p.url}</a> : <span className="text-neutral-400">unconfirmed</span>}
              </td>
              <td className="px-3 py-2 capitalize">{p.availability.replace('_', ' ')}</td>
              <td className="px-3 py-2">
                <a className="underline" href={`/account?return=${encodeURIComponent(p.url ?? '/')}`}>avatark.ai/account</a>
              </td>
              <td className="px-3 py-2 text-neutral-500">{p.adminUrl ?? 'product-owned, not centrally tracked'}</td>
              <td className="px-3 py-2">{grantCounts ? (grantCounts.get(p.id) ?? 0) : 'unknown (service role not configured)'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
