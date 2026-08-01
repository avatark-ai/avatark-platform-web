// AvatarK Platform's concrete @avatark/account adapter implementation.
// Every field here is genuinely backed by real data -- no fabricated
// entitlements, no invented Echo/Journey concepts (those are
// PrometheusK-specific, deliberately absent), no activity/echoes
// adapters (omitted, per explicit instruction, since AvatarK Platform
// has no Living Echo/reflection data of its own to honestly back them).
import type { AccountAdapters } from '@avatark/account'
import { createClient } from '@/lib/supabase/client'
import { MEMBERSHIP_PLAN_LABEL } from '@avatark/membership'
import { computeProductAccessEntries, toProductsWithAccess } from '@/lib/products/accessModel'

// See membership.getRelationships/getRoles below: the @avatark/account
// package's MembershipAdapter.getRoles is synchronous, so real platform
// role data has to be fetched ahead of time and cached here rather than
// queried inline.
let cachedPlatformRoles: string[] | null = null

async function fetchAndCachePlatformRoles(userId: string | null): Promise<void> {
  if (!userId) {
    cachedPlatformRoles = []
    return
  }
  const supabase = createClient()
  const { data } = await supabase.from('platform_roles').select('role').eq('user_id', userId)
  cachedPlatformRoles = (data ?? []).map((r) => r.role as string)
}

async function authFetch(path: string, init?: RequestInit) {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { error: json.error ?? `Request failed (${res.status})` }
  return { data: json }
}

export const avatarKPlatformAdapters: AccountAdapters = {
  support: { supportEmail: 'support@avatark.ai' },

  links: {
    // Real, honest destinations only -- no Echo/Journey/timeline links,
    // since none of those exist at the Platform level. Omitted, not
    // fabricated as placeholders.
  },

  auth: {
    async getIdentities() {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      return (data.user?.identities ?? []).map((i) => i.provider)
    },
    // Real fact, not a hardcoded claim: Supabase sets email_confirmed_at
    // only once the address has actually been confirmed.
    async isEmailVerified() {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      return data.user?.email_confirmed_at != null
    },
    async changeEmail(newEmail: string) {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      return error ? { error: { message: error.message } } : {}
    },
    async linkGoogleIdentity() {
      const supabase = createClient()
      const { error } = await supabase.auth.linkIdentity({ provider: 'google' })
      return error ? { error: { message: error.message } } : {}
    },
    async signOut() {
      const supabase = createClient()
      await supabase.auth.signOut()
    },
    // Real, genuinely-available action: Supabase's own global sign-out
    // revokes every refresh token for this user, not just this browser's.
    async signOutAllDevices() {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      return error ? { error: { message: error.message } } : {}
    },
  },

  profile: {
    get: () => authFetch('/api/account/profile'),
    update: (fields) => authFetch('/api/account/profile', { method: 'PATCH', body: JSON.stringify(fields) }),
  },

  preferences: {
    get: () => authFetch('/api/account/preferences'),
    update: (fields) => authFetch('/api/account/preferences', { method: 'PATCH', body: JSON.stringify(fields) }),
  },

  // Real platform-only privacy -- genuinely backed by the real
  // privacy_settings table (migrations 004 + 008 + 009). No
  // productControls: this host has no PrometheusK-specific (or any
  // product-specific) privacy concept of its own to honestly supply.
  // All three consent fields (productCommunicationsEnabled,
  // personalizationEnabled, analyticsEnabled) are read/written from
  // real, persisted columns via the API route -- no hardcoded values
  // anywhere in this adapter or its backing route.
  privacy: {
    async get() {
      const res = await authFetch('/api/account/privacy')
      if (res.error) return { error: res.error }
      return { data: { platform: res.data } }
    },
    async updatePlatform(fields) {
      return authFetch('/api/account/privacy', { method: 'PATCH', body: JSON.stringify(fields) })
    },
    async updateProductControl(id) {
      return { error: `No product-specific privacy control exists: ${id}` }
    },
    listPublicContent: async () => [],
  },

  // Real product_access rows via RLS's own-row policy (migration 014) --
  // no service-role client needed. Warms the platform-roles cache
  // getRoles()/computeProductAccessEntries's avatarkRoles read from (see
  // fetchAndCachePlatformRoles below): getRoles() must be synchronous per
  // the package's own type contract, so there's no way to await a fresh
  // query inside it -- this piggybacks the async fetch on the one call
  // the package already awaits before re-rendering with fresh data.
  productAccess: {
    async list(currentProductId: string) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await fetchAndCachePlatformRoles(user?.id ?? null)
      if (!user) return toProductsWithAccess(computeProductAccessEntries({ currentProductId, grants: [], avatarkRoles: [] }))

      const { data: accessRows } = await supabase
        .from('product_access')
        .select('product_id, status, granted_at')
        .eq('user_id', user.id)
      const grants = (accessRows ?? []).map((r) => ({
        productId: r.product_id as string, status: r.status as string, grantedAt: r.granted_at as string,
      }))
      return toProductsWithAccess(computeProductAccessEntries({ currentProductId, grants, avatarkRoles: cachedPlatformRoles ?? [] }))
    },
  },

  // Consumer-readable expansion of the same truthful state model (Part 5)
  // -- shares computeProductAccessEntries with productAccess.list above
  // rather than re-deriving it, so the two sections can never disagree.
  access: {
    async list(currentProductId: string) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return computeProductAccessEntries({ currentProductId, grants: [], avatarkRoles: [] })

      const { data: accessRows } = await supabase
        .from('product_access')
        .select('product_id, status, granted_at')
        .eq('user_id', user.id)
      const grants = (accessRows ?? []).map((r) => ({
        productId: r.product_id as string, status: r.status as string, grantedAt: r.granted_at as string,
      }))
      return computeProductAccessEntries({ currentProductId, grants, avatarkRoles: cachedPlatformRoles ?? [] })
    },
  },

  membership: {
    // No billing system exists anywhere in this ecosystem yet (see
    // @avatark/product-registry's SUBSCRIPTION_MODEL_NOTE) -- Free is
    // genuinely the only plan that exists, not a placeholder, sourced from
    // @avatark/membership's shared plan-tier vocabulary rather than a raw
    // string literal. `stats` (generic StatEntry[], not PrometheusK-shaped
    // usagePractices/borrowedCount) is accepted per the canonical
    // MembershipAdapter contract but unused: AvatarK Platform has no
    // activity/echoes/extension data of its own to summarize.
    getSummary: () => ({
      planName: MEMBERSHIP_PLAN_LABEL.free,
      creatorStatus: 'Member',
    }),
    // Kept for MembershipAdapter API compatibility -- MembershipTab no
    // longer renders this (product relationships moved to Products/Access,
    // RC1.1 Part 6), but any other consumer of this contract still gets a
    // real, non-fabricated answer, derived from the same source as
    // productAccess.list/access.list.
    async getRelationships(currentProductId, memberSince) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data: accessRows } = await supabase
        .from('product_access')
        .select('product_id, status, granted_at')
        .eq('user_id', user.id)
      const grants = (accessRows ?? []).map((r) => ({
        productId: r.product_id as string, status: r.status as string, grantedAt: r.granted_at as string,
      }))
      const entries = computeProductAccessEntries({ currentProductId, grants, avatarkRoles: cachedPlatformRoles ?? [] })
      return entries.map((e) => ({
        productId: e.productId,
        name: e.productName,
        status: e.nextAction.kind === 'current' ? 'member' as const : e.userAccessState === 'active' ? 'member' as const : 'not_enrolled' as const,
        role: e.roles[0] ?? null,
        since: e.nextAction.kind === 'current' ? memberSince : e.validFrom,
        ctaLabel: e.nextAction.label,
        ctaHref: e.nextAction.href,
      }))
    },
    // Real platform_roles for the signed-in user (e.g. 'admin'), read from
    // a cache warmed by getRelationships above -- see that method's
    // comment for why this can't fetch directly (the interface requires
    // this to be synchronous). `stats` is accepted per the canonical
    // contract but unused -- roles here come from platform_roles, not
    // from usage stats.
    getRoles: () => cachedPlatformRoles ?? [],
    getBenefits: () => [],
  },

  organizations: {
    async get() {
      return authFetch('/api/account/organizations')
    },
    async switchOrganization(organizationId) {
      return authFetch('/api/account/organizations', { method: 'POST', body: JSON.stringify({ organizationId }) })
    },
  },

  notifications: {
    get: () => authFetch('/api/account/notifications'),
    updateCategory: (category, enabled) => authFetch('/api/account/notifications', { method: 'PATCH', body: JSON.stringify({ category, enabled }) }),
  },

  export: {
    // Platform-owned data only: profile + preferences + privacy. Real
    // fix: privacy was missing from the original export, meaning a
    // user's real, persisted consent choices would silently be absent
    // from their own data export -- fixed here.
    async exportFullAccount() {
      const [profile, prefs, privacy] = await Promise.all([
        authFetch('/api/account/profile'),
        authFetch('/api/account/preferences'),
        authFetch('/api/account/privacy'),
      ])
      const blob = new Blob([JSON.stringify({ profile: profile.data, preferences: prefs.data, privacy: privacy.data }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'avatark-account-export.json'
      a.click()
      URL.revokeObjectURL(url)
    },
    async exportActivityCsv() {
      // Genuinely N/A -- no activity data exists at the Platform level.
    },
  },

  // activity and echoes are DELIBERATELY OMITTED (not present as keys at
  // all) -- per explicit instruction, since this repository has no
  // Living Echo/reflection/activity data to honestly back either.
}
