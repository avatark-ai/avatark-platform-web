// Pure aggregation of real product_access + platform_roles rows into a
// per-product summary for the Admin Products page. No fabricated counts --
// every number here is a direct tally over rows the caller already fetched
// from Supabase.
export interface ProductAccessRow {
  user_id: string
  product_id: string
  status: string
}

export interface PlatformRoleRow {
  user_id: string
  role: string
}

export interface ProductAccessSummary {
  totalGrants: number
  activeGrants: number
  adminGrantees: number
}

export function summarizeProductAccess(
  grants: ProductAccessRow[],
  roles: PlatformRoleRow[]
): Map<string, ProductAccessSummary> {
  const adminUserIds = new Set(roles.filter((r) => r.role === 'admin').map((r) => r.user_id))
  const summaries = new Map<string, ProductAccessSummary>()

  for (const grant of grants) {
    const existing = summaries.get(grant.product_id) ?? { totalGrants: 0, activeGrants: 0, adminGrantees: 0 }
    existing.totalGrants += 1
    if (grant.status === 'active') existing.activeGrants += 1
    if (adminUserIds.has(grant.user_id)) existing.adminGrantees += 1
    summaries.set(grant.product_id, existing)
  }

  return summaries
}
