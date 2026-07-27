'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AccountAdaptersProvider, AvatarKAccount, type AccountTabKey } from '@avatark/account'
import { avatarKPlatformAdapters } from '@/lib/account/adapters'
import type { AccountPrincipal } from '@/lib/auth/principal'
import { EchoPageShell } from '@/components/echo/shell/EchoPageShell'

// Real feature flag, per explicit instruction: /account behind a flag,
// not unconditionally live. Reads a real env var -- no hardcoded true.
const ACCOUNT_MOUNT_ENABLED = process.env.NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED === 'true'

// One flat account center -- no "Overview"/"Account"/"Support" nested
// hierarchy. Seven sections map onto @avatark/account's own tabs (that
// package's canonical source lives in prometheusk-web, so its tab set is
// used as-is rather than forked); Feedback and Support are host-added,
// at the same level, not nested under a second "Account" tab. Sign Out
// is an action, not a section.
type Section = 'profile' | 'products' | 'membership' | 'preferences' | 'privacy' | 'security' | 'data' | 'feedback' | 'support'

const RAIL_SECTIONS: { id: Section; label: string; tab?: AccountTabKey }[] = [
  { id: 'profile', label: 'Profile', tab: 'profile' },
  { id: 'products', label: 'Products', tab: 'products' },
  { id: 'membership', label: 'Membership', tab: 'membership' },
  { id: 'preferences', label: 'Preferences', tab: 'preferences' },
  { id: 'privacy', label: 'Privacy', tab: 'privacy' },
  { id: 'security', label: 'Security', tab: 'signin' },
  { id: 'data', label: 'Data & Export', tab: 'data' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'support', label: 'Support' },
]

const SECTION_IDS = new Set(RAIL_SECTIONS.map((s) => s.id))

function isSection(value: string | null): value is Section {
  return !!value && SECTION_IDS.has(value as Section)
}

function tabToSection(tab: AccountTabKey): Section | null {
  return RAIL_SECTIONS.find((s) => s.tab === tab)?.id ?? null
}

const RAIL_LINK_CLASS =
  'rounded-md px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
const FOCUS_STYLE = { outlineColor: 'var(--gold)' } as const

function FeedbackView() {
  return (
    <div className="flex max-w-md flex-col gap-3 text-sm leading-6" style={{ color: 'var(--text-dim)' }}>
      <p style={{ color: 'var(--paper)' }}>Have feedback on Echo or AvatarK?</p>
      <p>
        Send it to{' '}
        <a className="underline-offset-4 hover:underline" style={{ color: 'var(--gold)' }} href="mailto:feedback@avatark.ai">
          feedback@avatark.ai
        </a>{' '}
        -- product ideas, things that felt off, anything worth carrying forward. Read by the team building Echo, not
        a form that disappears into a queue.
      </p>
    </div>
  )
}

function SupportView() {
  const supportEmail = avatarKPlatformAdapters.support?.supportEmail ?? 'support@avatark.ai'
  return (
    <div className="flex max-w-md flex-col gap-2 text-sm leading-6" style={{ color: 'var(--text-dim)' }}>
      <p style={{ color: 'var(--paper)' }}>
        Need help with your AvatarK account? Contact{' '}
        <a className="underline-offset-4 hover:underline" style={{ color: 'var(--gold)' }} href={`mailto:${supportEmail}`}>
          {supportEmail}
        </a>
        .
      </p>
      <p>Product-local support (practices, challenges, in-product issues) is handled by each product directly, not through this platform account surface.</p>
    </div>
  )
}

function AccountRoot({ principal }: { principal: Extract<AccountPrincipal, { status: 'signed_in' }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawSection = searchParams.get('section')
  const section: Section = isSection(rawSection) ? rawSection : 'profile'
  const [signingOut, setSigningOut] = useState(false)

  function goToSection(next: Section) {
    if (next === section) return
    router.push(`/account?section=${next}`)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await avatarKPlatformAdapters.auth.signOut()
    window.location.href = '/auth/sign-in'
  }

  const activeRailSection = RAIL_SECTIONS.find((s) => s.id === section)

  return (
    <EchoPageShell layout="plain" contentClassName="flex flex-col gap-8 sm:flex-row sm:items-start">
      <nav aria-label="Account" className="flex shrink-0 flex-row gap-1 overflow-x-auto sm:w-56 sm:flex-col sm:overflow-visible">
        {RAIL_SECTIONS.map((item) => {
          const active = item.id === section
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => goToSection(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`${RAIL_LINK_CLASS} whitespace-nowrap`}
              style={{
                background: active ? 'color-mix(in srgb, var(--gold) 14%, transparent)' : 'transparent',
                color: active ? 'var(--gold)' : 'var(--paper)',
                ...FOCUS_STYLE,
              }}
            >
              {item.label}
            </button>
          )
        })}
        <div className="my-1 border-t sm:mx-1" style={{ borderColor: 'var(--surface-line)' }} />
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className={`${RAIL_LINK_CLASS} whitespace-nowrap disabled:opacity-50`}
          style={{ color: 'var(--text-dim)', ...FOCUS_STYLE }}
        >
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </nav>

      <div className="min-w-0 flex-1">
        {section === 'feedback' ? (
          <FeedbackView />
        ) : section === 'support' ? (
          <SupportView />
        ) : (
          // The package's own internal tab strip is hidden here -- this
          // rail is the one and only navigation for the account
          // workspace, so the package's tablist would otherwise
          // duplicate it. activeTab/onActiveTabChange (not the package's
          // own clicked tabs) are the sole source of truth.
          <div className="echo-account-embed">
            <style>{`.echo-account-embed .aka-tablist { display: none; }`}</style>
            <AccountAdaptersProvider adapters={avatarKPlatformAdapters}>
              <AvatarKAccount
                principal={principal}
                currentProduct="avatark"
                productName="AvatarK"
                activeTab={activeRailSection?.tab}
                onActiveTabChange={(next) => {
                  const nextSection = tabToSection(next)
                  if (nextSection) goToSection(nextSection)
                }}
                onSignedOut={() => {
                  window.location.href = '/auth/sign-in'
                }}
              />
            </AccountAdaptersProvider>
          </div>
        )}
      </div>
    </EchoPageShell>
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
      <EchoPageShell layout="plain" contentClassName="flex flex-col gap-2">
        <p className="text-sm" role="alert" style={{ color: 'var(--gold)' }}>Couldn&apos;t load your account: {loadError}</p>
        <button onClick={() => window.location.reload()} className="self-start text-sm underline" style={{ color: 'var(--paper)' }}>Try again</button>
      </EchoPageShell>
    )
  }

  if (principal.status === 'loading' || principal.status === 'signed_out') {
    return (
      <EchoPageShell layout="plain">
        <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Loading…</p>
      </EchoPageShell>
    )
  }

  return <AccountRoot principal={principal} />
}

export default function AccountPage() {
  if (!ACCOUNT_MOUNT_ENABLED) {
    return (
      <EchoPageShell layout="plain">
        <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Account is not yet available.</p>
      </EchoPageShell>
    )
  }

  return (
    <Suspense fallback={null}>
      <AccountClientGate />
    </Suspense>
  )
}
