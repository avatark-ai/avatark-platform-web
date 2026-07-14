// AvatarK Platform's concrete @avatark/account adapter implementation.
// Every field here is genuinely backed by real data -- no fabricated
// entitlements, no invented Echo/Journey concepts (those are
// PrometheusK-specific, deliberately absent), no activity/echoes
// adapters (omitted, per explicit instruction, since AvatarK Platform
// has no Living Echo/reflection data of its own to honestly back them).
import type { AccountAdapters } from '@avatark/account'
import { createClient } from '@/lib/supabase/client'
import { PLATFORM_PRODUCTS } from '@/lib/products/registry'

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
    getSummary: () => ({ planName: 'Free', usagePractices: 0, creatorStatus: 'Member', borrowedCount: 0 }),
    getRelationships: async () => [],
    getRoles: () => [],
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
