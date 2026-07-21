// Reference IdentityProvider implementation for AvatarK Platform itself,
// backed by Supabase Auth. Products outside this repo cannot import this
// file directly (it's server-only and lives in a single Next.js app, not
// a published package) -- see IdentityProvider in ./types for why that's
// an intentional, not-yet-solved next step, not an oversight.
import { createClient } from '@/lib/supabase/server'
import type { IdentityClaims, IdentityProvider } from './types'
import { safeReturnPath } from '@/lib/auth/safeReturnPath'
import { loadIdentityExtras } from './claims'

// Same-origin by default (Platform's own account/sign-in pages). Set to
// e.g. https://identity.avatark.ai once the hostname split in AGENTS.md's
// "Identity" surface actually happens -- not done in this checkpoint.
const PLATFORM_ORIGIN = process.env.NEXT_PUBLIC_PLATFORM_ORIGIN ?? ''

async function loadClaims(user: { id: string; email?: string | null }): Promise<IdentityClaims> {
  const supabase = await createClient()
  const [{ data: profile }, extras] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    loadIdentityExtras(supabase, user.id),
  ])

  return {
    subjectId: user.id,
    email: user.email ?? '',
    displayName: profile?.display_name ?? user.email?.split('@')[0] ?? 'Member',
    ...extras,
  }
}

export const supabaseIdentityProvider: IdentityProvider = {
  async getUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    return loadClaims(user)
  },

  async verifySession() {
    // supabase.auth.getUser() always round-trips to the Supabase auth
    // server (unlike getSession(), which can return a locally-cached,
    // unverified JWT) -- so this is genuinely a re-verification, not a
    // trust-the-client shortcut, despite calling the same method as
    // getUser() above.
    return supabaseIdentityProvider.getUser()
  },

  async refreshSession() {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.refreshSession()
    if (error || !data.user) return null
    return loadClaims(data.user)
  },

  async signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
  },

  accountUrl(returnTo?: string) {
    if (!returnTo) return `${PLATFORM_ORIGIN}/account`
    const safePath = safeReturnPath(returnTo, '/account')
    return `${PLATFORM_ORIGIN}/account?return=${encodeURIComponent(safePath)}`
  },

  signOutUrl() {
    return `${PLATFORM_ORIGIN}/auth/sign-in`
  },
}
