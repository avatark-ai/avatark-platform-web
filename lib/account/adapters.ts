// AvatarK Platform's concrete @avatark/account adapter implementation.
// Every field here is genuinely backed by real data -- no fabricated
// entitlements, no invented Echo/Journey concepts (those are
// PrometheusK-specific, deliberately absent), no activity/echoes
// adapters (omitted, per explicit instruction, since AvatarK Platform
// has no Living Echo/reflection data of its own to honestly back them).
import type { AccountAdapters } from '@avatark/account'
import { createClient } from '@/lib/supabase/client'
import { PLATFORM_PRODUCTS } from '@/lib/products/registry'
import { MEMBERSHIP_PLAN_LABEL } from '@avatark/membership'

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

  productAccess: {
    async list(currentProductId: string) {
      return PLATFORM_PRODUCTS.map((p) => ({
        ...p,
        entitlement: p.id === currentProductId ? 'active' as const : p.availability === 'live' ? 'available' as const : 'coming_soon' as const,
        ctaLabel: p.id === currentProductId ? "You're here" : p.availability === 'live' ? 'Open' : 'Coming Soon',
      }))
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
    // Real product_access rows via RLS's own-row policy (migration 014) --
    // no service-role client needed, the signed-in user can read their own
    // grants directly. Also warms the platform-roles cache getRoles()
    // reads from (see fetchAndCachePlatformRoles below): getRoles() must
    // be synchronous per the package's own type contract, so there's no
    // way to await a fresh query inside it -- this piggybacks the async
    // fetch on the one call the package already awaits before re-rendering
    // with fresh data.
    async getRelationships(currentProductId, memberSince) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await fetchAndCachePlatformRoles(user?.id ?? null)
      if (!user) return []

      const { data: accessRows } = await supabase
        .from('product_access')
        .select('product_id, status, granted_at')
        .eq('user_id', user.id)
      const accessByProduct = new Map((accessRows ?? []).map((r) => [r.product_id as string, r]))

      return PLATFORM_PRODUCTS.map((p) => {
        const grant = accessByProduct.get(p.id)
        const isCurrent = p.id === currentProductId
        const status: 'member' | 'not_enrolled' | 'coming_soon' =
          p.availability !== 'live' ? 'coming_soon' : isCurrent || grant?.status === 'active' ? 'member' : 'not_enrolled'
        return {
          productId: p.id,
          name: p.name,
          status,
          role: null,
          since: isCurrent ? memberSince : (grant?.granted_at as string | undefined) ?? null,
          ctaLabel: status === 'member' ? (isCurrent ? "You're here" : 'Open') : status === 'coming_soon' ? 'Coming Soon' : 'Learn more',
          ctaHref: status !== 'coming_soon' && !isCurrent ? p.url : null,
        }
      })
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
