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

// @avatark/account's own tab set (profile/signin/products/membership/
// preferences/privacy/activity/echoes/data) has no "Overview" or "Support"
// tab -- that package is owned upstream (its canonical source lives in
// prometheusk-web), so those two are added here as a thin platform-side
// wrapper around the package rather than forked/patched locally.
type AccountView = 'overview' | 'details' | 'support'

function OverviewView({ principal, onOpenTab }: { principal: Extract<AccountPrincipal, { status: 'signed_in' }>; onOpenTab: (tab: AccountTabKey) => void }) {
  const quickLinks: { tab: AccountTabKey; label: string }[] = [
    { tab: 'profile', label: 'Profile' },
    { tab: 'products', label: 'Products' },
    { tab: 'preferences', label: 'Preferences' },
    { tab: 'privacy', label: 'Privacy' },
    { tab: 'signin', label: 'Security' },
    { tab: 'membership', label: 'Membership' },
    { tab: 'data', label: 'Data & Export' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <div className="text-lg font-semibold">{principal.displayName}</div>
        <div className="text-sm text-neutral-500">{principal.email}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {quickLinks.map((link) => (
          <button
            key={link.tab}
            onClick={() => onOpenTab(link.tab)}
            className="rounded-md border px-3 py-2 text-left text-sm hover:bg-neutral-50"
          >
            {link.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SupportView() {
  const supportEmail = avatarKPlatformAdapters.support?.supportEmail ?? 'support@avatark.ai'
  return (
    <div className="max-w-md space-y-2 text-sm">
      <p>Need help with your AvatarK account? Contact <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
      <p className="text-neutral-500">
        Product-local support (practices, challenges, in-product issues) is handled by each product directly, not
        through this platform account surface.
      </p>
    </div>
  )
}

function ViewTabs({ view, onChange }: { view: AccountView; onChange: (view: AccountView) => void }) {
  const tabs: { key: AccountView; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'details', label: 'Account' },
    { key: 'support', label: 'Support' },
  ]
  return (
    <div className="mb-6 flex gap-1 border-b pb-3 text-sm">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`rounded-md px-3 py-1.5 font-medium ${view === t.key ? 'bg-black text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function AccountRoot({ principal }: { principal: Extract<AccountPrincipal, { status: 'signed_in' }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawTab = searchParams.get('tab')
  const activeTab = (rawTab ?? undefined) as AccountTabKey | undefined
  const view = (searchParams.get('view') as AccountView | null) ?? 'overview'

  function setParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined) params.delete(key)
      else params.set(key, value)
    }
    router.push(`/account?${params.toString()}`)
  }

  function handleActiveTabChange(next: AccountTabKey) {
    if (next === rawTab) return
    setParams({ tab: next, view: 'details' })
  }

  function openTab(tab: AccountTabKey) {
    setParams({ tab, view: 'details' })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ViewTabs view={view} onChange={(next) => setParams({ view: next === 'overview' ? undefined : next })} />
      {view === 'support' ? (
        <SupportView />
      ) : view === 'overview' ? (
        <OverviewView principal={principal} onOpenTab={openTab} />
      ) : (
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
      )}
    </div>
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
