// Shared "extra claims" loader for the cross-product identity contract.
// Same tables, same own-row RLS policies (migration 014), same query
// shapes lib/account/adapters.ts's fetchAndCachePlatformRoles/
// getRelationships and lib/admin/authz.ts's admin check already use --
// extracted here so lib/identity/ (the contract other products are meant
// to consume) and the account/admin surfaces read one implementation of
// "what does this user belong to/have access to/hold a role in" instead of
// three independently-drifting copies.
import type { SupabaseClient } from '@supabase/supabase-js'

export interface IdentityExtras {
  organizationIds: string[]
  productAccess: string[]
  roles: string[]
}

// Takes whatever Supabase client the caller already has -- a cookie-backed
// server client (same-origin /api/identity/me) or a client scoped to a
// verified bearer token (/api/identity/verify) -- and reads only that
// client's own RLS-visible rows. No service-role client, no new policy:
// migration 014's "_select_own" policies already scope every one of these
// three tables to `user_id = auth.uid()`, so a plain authenticated read is
// enough, exactly as lib/account/adapters.ts already relies on today.
export async function loadIdentityExtras(supabase: SupabaseClient, userId: string): Promise<IdentityExtras> {
  const [{ data: orgRows }, { data: accessRows }, { data: roleRows }] = await Promise.all([
    supabase.from('organization_members').select('org_id').eq('user_id', userId),
    supabase.from('product_access').select('product_id').eq('user_id', userId).eq('status', 'active'),
    supabase.from('platform_roles').select('role').eq('user_id', userId),
  ])

  return {
    organizationIds: (orgRows ?? []).map((r) => r.org_id as string),
    productAccess: (accessRows ?? []).map((r) => r.product_id as string),
    roles: (roleRows ?? []).map((r) => r.role as string),
  }
}
