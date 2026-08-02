// Thin Supabase I/O layer for capability_grants — deliberately separate
// from resolver.ts's pure logic (same split lib/identity/claims.ts and
// lib/organizations/adapter.ts already use in this repo). Every function
// here degrades to an honest "adapter_error"/empty result on failure —
// never throws into a caller, per the mission's default-deny requirement.
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveCapabilityFromGrants } from './resolver.ts'
import type { CapabilityGrantRow, CapabilityResolution, CapabilityScope } from './types.ts'

// Exported so lib/capabilities/adminGrants.ts (the service-role mutation
// path) reads/writes the exact same column list and row mapping as this
// read path, instead of a second, driftable copy.
export const GRANT_COLUMNS = 'id, user_id, capability, scope_type, scope_id, granted_at, granted_by, expires_at, revoked_at'

export interface CapabilityGrantDbRow {
  id: string
  user_id: string
  capability: string
  scope_type: string
  scope_id: string | null
  granted_at: string
  granted_by: string | null
  expires_at: string | null
  revoked_at: string | null
}

export function toCapabilityGrantRow(row: CapabilityGrantDbRow): CapabilityGrantRow {
  return {
    id: row.id,
    userId: row.user_id,
    capability: row.capability,
    scopeType: row.scope_type as CapabilityGrantRow['scopeType'],
    scopeId: row.scope_id,
    grantedAt: row.granted_at,
    grantedBy: row.granted_by,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  }
}

// Real, own-row RLS-scoped read (migration 020's "capability_grants_select_own"
// policy) — same trust boundary lib/account/adapters.ts and lib/identity/
// claims.ts already rely on for product_access/platform_roles, so this can
// run against a plain authenticated client, no service-role needed.
export async function resolveCapability(
  supabase: SupabaseClient,
  input: { userId: string; capability: string; scope: CapabilityScope; now?: Date }
): Promise<CapabilityResolution> {
  if (!input.userId) return { granted: false, reason: 'no_grant' }
  try {
    const { data, error } = await supabase
      .from('capability_grants')
      .select(GRANT_COLUMNS)
      .eq('user_id', input.userId)
      .eq('capability', input.capability)
    if (error) return { granted: false, reason: 'adapter_error' }
    const rows = ((data ?? []) as CapabilityGrantDbRow[]).map(toCapabilityGrantRow)
    return resolveCapabilityFromGrants(rows, { capability: input.capability, scope: input.scope, now: input.now })
  } catch {
    return { granted: false, reason: 'adapter_error' }
  }
}

// Bulk read for surfaces that display "everything this user currently
// holds" (the Access tab's capabilities list, diagnostics' raw-id
// summary) rather than checking one specific capability+scope. Returns
// only currently-active rows (not revoked, not expired) — callers never
// see a revoked/expired grant here and must not infer one is "pending";
// use resolveCapability for a single capability's full lifecycle detail.
// Empty array on any failure (missing table, network error, RLS denial)
// — indistinguishable from "genuinely has none yet," which is the
// correct, honest default for a forward-compatible feature with no
// writers yet.
export async function listActiveCapabilityGrants(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<CapabilityGrantRow[]> {
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('capability_grants')
      .select(GRANT_COLUMNS)
      .eq('user_id', userId)
      .is('revoked_at', null)
    if (error || !data) return []
    return (data as CapabilityGrantDbRow[])
      .map(toCapabilityGrantRow)
      .filter((g) => g.expiresAt === null || new Date(g.expiresAt).getTime() > now.getTime())
  } catch {
    return []
  }
}
