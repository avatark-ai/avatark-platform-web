// Real, live reachability checks for the System Information section (both
// tiers) -- replacing the hardcoded `invitationsConfigured: true` literal
// duplicated in app/status/page.tsx and app/admin/page.tsx (found during
// this session's audit: never computed from anything real, always true,
// never false in any code path). Every check here is a genuine round trip
// against the service-role client -- a `head: true` count query, or a real
// storage bucket lookup -- not a config-presence guess. Modeled on
// app/admin/page.tsx's own getSupabaseHealth() live query, generalized to
// every table System Information needs a state for.
//
// 'unknown' (never a guessed 'operational') whenever the admin client
// itself isn't configured -- mirrors every other adapter's degrade-safely
// rule in this repo (lib/capabilities/queries.ts, lib/supabase/admin.ts).
import type { SupabaseClient } from '@supabase/supabase-js'

export type ServiceHealth = 'operational' | 'degraded' | 'unavailable' | 'unknown'

export interface SystemHealthSnapshot {
  identity: ServiceHealth
  account: ServiceHealth
  storage: ServiceHealth
  capabilities: ServiceHealth
  invitations: ServiceHealth
  organizations: ServiceHealth
  audit: ServiceHealth
  checkedAt: string
}

async function tableReachable(admin: SupabaseClient, table: string): Promise<ServiceHealth> {
  try {
    const { error } = await admin.from(table).select('*', { count: 'exact', head: true })
    if (!error) return 'operational'
    // 42P01 = undefined_table (Postgres): the table genuinely doesn't
    // exist in this database yet (e.g. a migration hasn't been applied
    // here) -- a real, honest 'unavailable', not a guess.
    if (error.code === '42P01') return 'unavailable'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export async function computeSystemHealth(
  admin: SupabaseClient | null,
  identityHealthy: boolean
): Promise<SystemHealthSnapshot> {
  const checkedAt = new Date().toISOString()
  if (!admin) {
    return {
      identity: identityHealthy ? 'operational' : 'unavailable',
      account: 'unknown', storage: 'unknown', capabilities: 'unknown',
      invitations: 'unknown', organizations: 'unknown', audit: 'unknown',
      checkedAt,
    }
  }

  const [account, capabilities, invitations, organizations, audit, storage] = await Promise.all([
    tableReachable(admin, 'account_preferences'),
    tableReachable(admin, 'capability_grants'),
    tableReachable(admin, 'organization_invitations'),
    tableReachable(admin, 'organizations'),
    tableReachable(admin, 'platform_audit_events'),
    admin.storage
      .getBucket('avatars')
      .then(({ error }) => (error ? 'unavailable' : 'operational') as ServiceHealth)
      .catch(() => 'unknown' as ServiceHealth),
  ])

  return {
    identity: identityHealthy ? 'operational' : 'unavailable',
    account, storage, capabilities, invitations, organizations, audit,
    checkedAt,
  }
}
