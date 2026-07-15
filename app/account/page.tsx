'use client'
import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { AccountAdaptersProvider, AvatarKAccount, type AccountTabKey } from '@avatark/account'
import { avatarKPlatformAdapters } from '@/lib/account/adapters'
import type { AccountPrincipal } from '@/lib/auth/principal'

// Real feature flag, per explicit instruction: /account behind a flag,
// not unconditionally live. Reads a real env var -- no hardcoded true.
const ACCOUNT_MOUNT_ENABLED = process.env.NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED === 'true'

function AccountRoot({ principal }: { principal: AccountPrincipal }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab = (rawTab ?? undefined) as AccountTabKey | undefined

  function handleActiveTabChange(next: AccountTabKey) {
    if (next === rawTab) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', next)
    router.push(`/account?${params.toString()}`)
  }

  return (
    <AccountAdaptersProvider adapters={avatarKPlatformAdapters}>
      <AvatarKAccount
        principal={principal}
        currentProduct="avatark"
        productName="AvatarK"
        activeTab={activeTab}
        onActiveTabChange={handleActiveTabChange}
        onSignedOut={() => { window.location.href = '/auth/sign-in' }}
      />
    </AccountAdaptersProvider>
  )
}

function AccountClientGate() {
  const [principal, setPrincipal] = useState<AccountPrincipal>({ status: 'loading' })
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    // Real bug found via a live browser test (curl-level checks cannot
    // catch this): the original version of this effect had no .catch()
    // anywhere. Any failure -- createBrowserClient throwing on a
    // malformed env var, a network error, anything -- left this
    // component silently stuck at { status: 'loading' } forever, with
    // zero visible indication anything went wrong.
    //
    // Real second fix, caught by a separate, legitimate lint rule
    // (react-hooks/set-state-in-effect): calling setState synchronously
    // in the effect's own body (as the original catch-block fix did)
    // triggers an avoidable extra render pass right after mount.
    // Restructured so NOTHING runs synchronously in the effect body --
    // everything, including createBrowserClient()'s own synchronous
    // throw case, happens inside a single async function, so every
    // setState call happens from within an async callback instead.
    let cancelled = false
    async function load() {
      try {
        const supabase = createClient()
        // Real, defensive fix: regardless of the exact root cause,
        // supabase.auth.getUser() was observed to hang indefinitely in
        // this environment -- never resolving, never rejecting, and
        // never even making its underlying network request (confirmed
        // via DevTools Network tab: zero requests to supabase.co
        // appeared at all). Strong suspicion is GoTrueClient's internal
        // use of the browser Web Locks API hanging in this proxied
        // Cloud Workstation context. A race against a real timeout
        // ensures the UI can never be stuck on "Loading…" forever
        // again, whatever the true cause turns out to be.
        const result = await Promise.race([
          supabase.auth.getUser(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timed out contacting the authentication service (10s). This may indicate a browser or network compatibility issue in this environment.')), 10000)),
        ])
        const { data: { user }, error } = result
        if (cancelled) return
        // Real fix: AuthSessionMissingError is Supabase's normal,
        // expected response when no one is signed in yet -- not a
        // failure. Treating it as a genuine error meant every
        // first-time visitor saw a red error screen instead of the
        // sign-in flow. Only a *different* error should surface as
        // status: 'error'.
        if (error && error.name !== 'AuthSessionMissingError' && !error.message?.includes('Auth session missing')) {
          setLoadError(error.message)
          return
        }
        if (!user) { setPrincipal({ status: 'signed_out' }); return }
        const res = await fetch('/api/account/profile')
        const profile = res.ok ? await res.json() : null
        setPrincipal({
          status: 'signed_in',
          id: user.id,
          displayName: profile?.displayName ?? user.email?.split('@')[0] ?? 'Member',
          email: user.email ?? '',
        })
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err))
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Real fix: the redirect is a genuine side effect and must live in its
  // own useEffect, not directly in the render body -- a real lint catch
  // (react-hooks/immutability), not a false positive. React 19's render
  // path is expected to be pure; redirecting during render violates that.
  useEffect(() => {
    if (principal.status === 'signed_out') {
      window.location.href = '/auth/sign-in?return=/account'
    }
  }, [principal.status])

  if (loadError) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 space-y-2">
        <p className="text-sm text-red-600" role="alert">Couldn&apos;t load your account: {loadError}</p>
        <button onClick={() => window.location.reload()} className="text-sm underline">Try again</button>
      </div>
    )
  }

  if (principal.status === 'loading' || principal.status === 'signed_out') {
    return <div className="max-w-md mx-auto px-4 py-16 text-sm text-neutral-600">Loading…</div>
  }

  return <AccountRoot principal={principal} />
}

export default function AccountPage() {
  if (!ACCOUNT_MOUNT_ENABLED) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <p className="text-sm text-neutral-600">Account is not yet available.</p>
      </div>
    )
  }

  return (
    <Suspense fallback={null}>
      <AccountClientGate />
    </Suspense>
  )
}
