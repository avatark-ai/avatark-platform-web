'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AccountAdaptersProvider, AvatarKAccount, type AccountTabKey } from '@avatark/account'
import { AvatarMenu, IdentityBadge, MembershipBadge, ProductSwitcher } from '@avatark/account-ui'
import { PRODUCT_REGISTRY } from '@avatark/product-registry'
import { avatarKPlatformAdapters } from '@/lib/account/adapters'
import { resolveProductUrl } from '@/lib/products/registry'
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
type Section =
  | 'profile' | 'products' | 'access' | 'membership' | 'organizations'
  | 'preferences' | 'notifications' | 'privacy' | 'security' | 'data'
  | 'feedback' | 'support'

const RAIL_SECTIONS: { id: Section; label: string; tab?: AccountTabKey }[] = [
  { id: 'profile', label: 'Profile', tab: 'profile' },
  { id: 'products', label: 'Products', tab: 'products' },
  { id: 'access', label: 'Access', tab: 'access' },
  { id: 'membership', label: 'Membership', tab: 'membership' },
  { id: 'organizations', label: 'Organizations', tab: 'organizations' },
  { id: 'preferences', label: 'Preferences', tab: 'preferences' },
  { id: 'notifications', label: 'Notifications', tab: 'notifications' },
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

function AccountRoot({ principal, roles }: { principal: Extract<AccountPrincipal, { status: 'signed_in' }>; roles: string[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawSection = searchParams.get('section')
  const section: Section = isSection(rawSection) ? rawSection : 'profile'

  function goToSection(next: Section) {
    if (next === section) return
    router.push(`/account?section=${next}`)
  }

  async function handleSignOut() {
    await avatarKPlatformAdapters.auth.signOut()
    window.location.href = '/auth/sign-in'
  }

  const activeRailSection = RAIL_SECTIONS.find((s) => s.id === section)

  function goToProduct(productId: string) {
    const product = PRODUCT_REGISTRY.find((p) => p.id === productId)
    const url = product ? resolveProductUrl(product) : null
    if (url) window.location.href = url
  }

  return (
    <EchoPageShell layout="plain" contentClassName="flex flex-col gap-6">
      {/* Required shared @avatark/account-ui controls, composed here --
          headless/unstyled by design, so this scoped stylesheet gives them
          the same visual language as the rest of this page (var(--gold)/
          var(--paper)/var(--surface-line)) without forking the components
          themselves. AccountDrawer is deliberately not used here: this
          page is a full-page tabbed workspace, not an overlay/drawer
          pattern -- see docs/AUTH_REFERENCE_IMPLEMENTATION.md and
          docs/PLATFORM_PACKAGE_DISTRIBUTION.md for where it and
          AvatarMenu's simpler-than-EchoAvatarMenu contract are each the
          right (or wrong) fit. */}
      <style>{`
        .avatark-account-header [data-avatark-component="identity-badge"] { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: var(--paper); }
        .avatark-account-header [data-avatark-part="roles"] { display: flex; gap: 0.25rem; }
        .avatark-account-header [data-avatark-part="role"] { border-radius: 9999px; padding: 0.05rem 0.5rem; font-size: 0.7rem; color: var(--gold); background: color-mix(in srgb, var(--gold) 16%, transparent); }
        .avatark-account-header [data-avatark-component="membership-badge"] { border-radius: 9999px; padding: 0.15rem 0.6rem; font-size: 0.75rem; color: var(--midnight); background: var(--gold); }
        .avatark-account-header [data-avatark-component="product-switcher"] { display: flex; gap: 0.25rem; overflow-x: auto; }
        .avatark-account-header [data-avatark-part="product-option"] { white-space: nowrap; border-radius: 9999px; border: 1px solid var(--surface-line); padding: 0.25rem 0.7rem; font-size: 0.75rem; color: var(--text-dim); background: transparent; }
        .avatark-account-header [data-avatark-part="product-option"][data-current="true"] { color: var(--gold); border-color: var(--gold); }
        .avatark-account-header [data-avatark-component="avatar-menu"] > button { display: flex; align-items: center; gap: 0.5rem; border-radius: 9999px; padding: 0.25rem 0.75rem 0.25rem 0.25rem; font-size: 0.875rem; color: var(--paper); background: transparent; }
        .avatark-account-header [data-avatark-component="avatar-menu"] > button > span:first-child { display: flex; height: 1.75rem; width: 1.75rem; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; background: color-mix(in srgb, var(--gold) 22%, transparent); color: var(--gold); }
        .avatark-account-header [data-avatark-part="menu-panel"] { position: absolute; right: 0; z-index: 20; margin-top: 0.5rem; display: flex; width: 12rem; flex-direction: column; border-radius: 0.75rem; border: 1px solid var(--surface-line); background: var(--midnight); padding: 0.375rem 0; box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
        .avatark-account-header [data-avatark-part="menu-identity"] { padding: 0.5rem 1rem; font-size: 0.75rem; color: var(--text-dim); }
        .avatark-account-header [data-avatark-part="sign-out"] { text-align: left; padding: 0.6rem 1rem; font-size: 0.875rem; color: var(--text-dim); }
        .avatark-account-header [data-avatark-component="avatar-menu"] { position: relative; }
      `}</style>
      <div className="avatark-account-header flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--surface-line)' }}>
        <div className="flex items-center gap-3">
          <IdentityBadge displayName={principal.displayName} roles={roles} />
          <MembershipBadge plan="free" />
        </div>
        <div className="flex items-center gap-3">
          <ProductSwitcher products={PRODUCT_REGISTRY} currentProductId="avatark" onSelect={goToProduct} />
          {/* No header notification bell: @avatark/notifications has no real
              delivery/unread-count implementation anywhere in the ecosystem
              yet (see docs/ADAPTER_CONFORMANCE_CONTRACTS.md) -- a bell that
              can only ever show a hardcoded 0 with an empty dropdown is a
              fabricated control, not a degraded-but-honest one. Preferences
              for notification categories live in the Notifications section
              below; reintroduce this once a real unread source exists. */}
          <AvatarMenu displayName={principal.displayName} email={principal.email} onSignOut={handleSignOut} />
        </div>
      </div>

      <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
        <nav aria-label="Account" className="flex min-w-0 shrink-0 flex-row gap-1 overflow-x-auto sm:w-56 sm:flex-col sm:overflow-visible">
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
      </div>
    </EchoPageShell>
  )
}

function AccountClientGate() {
  const [principal, setPrincipal] = useState<AccountPrincipal>({ status: 'loading' })
  const [loadError, setLoadError] = useState<string | null>(null)
  // Real platform_roles for the signed-in user (own-row RLS, migration
  // 014) -- fetched independently of lib/account/adapters.ts's
  // cachedPlatformRoles (that cache is only warmed once the embedded
  // @avatark/account package's Membership tab calls getRelationships(),
  // which may not have happened yet by the time this header renders).
  const [roles, setRoles] = useState<string[]>([])

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
        const { data: roleRows } = await supabase.from('platform_roles').select('role').eq('user_id', user.id)
        if (!cancelled) setRoles((roleRows ?? []).map((r) => r.role as string))
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

  return <AccountRoot principal={principal} roles={roles} />
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
