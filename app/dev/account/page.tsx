'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AccountAdaptersProvider, AvatarKAccount, createMockAdapters, extensionTabKey, type AccountTabKey } from '@avatark/account'
import { AvatarMenu, IdentityBadge, MembershipBadge, ProductSwitcher } from '@avatark/account-ui'
import { PRODUCT_REGISTRY } from '@avatark/product-registry'
import { createContextAdapter } from '@/lib/account/contextAdapter'
import { createLivingWorldsAdapter } from '@/lib/account/livingWorldsAdapter'
import { ExperienceView } from '@/components/account/ExperienceView'
import { TimelineView } from '@/components/account/TimelineView'

// Dev-only, unauthenticated preview of the real @avatark/account component
// tree against createMockAdapters() -- same precedent as
// app/dev/integration/page.tsx (no auth, not linked from nav, see
// components/echo/shell/EchoShell.tsx's /dev exclusion). This is NOT a
// substitute for a real authenticated session: it verifies component
// rendering/layout/responsive/duplicate-nav/empty-state behavior against
// well-formed mock data, never real adapter data plumbing. See
// docs/IDENTITY_RC11_ACCOUNT_AUDIT.md.
//
// Runtime Kernel Host Integration (Sprint 4) exception: `currentContext`
// and `livingWorlds` below are overridden onto REAL, runtime-backed
// adapters (not mocks) pointed at /api/dev/account/* instead of
// /api/account/* -- this environment has no Supabase project configured
// at all, so this is the only way to exercise real Living World/Context/
// Experience runtime behavior end-to-end (including via Playwright) here.
// Every other field stays mock, unchanged from the original precedent.
const DEV_API_BASE = '/api/dev/account'
const devFetch: typeof fetch = (input, init) => {
  const url = typeof input === 'string' && input.startsWith('/api/account/')
    ? input.replace('/api/account/', `${DEV_API_BASE}/`)
    : input
  return fetch(url, init)
}
const mockAdapters = {
  ...createMockAdapters(),
  currentContext: createContextAdapter(devFetch),
  livingWorlds: createLivingWorldsAdapter(devFetch),
}
const mockPrincipal = { status: 'signed_in' as const, id: 'dev-preview-user', displayName: 'Dev Preview', email: 'dev-preview@example.invalid' }

type Section =
  | 'profile' | 'products' | 'access' | 'membership' | 'organizations' | 'livingWorlds'
  | 'preferences' | 'notifications' | 'privacy' | 'security' | 'systemInformation' | 'data'
  | 'extension-demo' | 'journey' | 'timeline'

// 'extension-demo' exercises the generic ExtensionAdapter mechanism
// (mockAdapters' 'mock-extension' slot) -- demonstrates that a
// product-specific extension slot renders and gates correctly through
// the canonical shell, per the mission's extension-demonstration
// requirement. 'journey' ("Experience") and 'timeline' are host-owned,
// same pattern as app/account/page.tsx -- no `tab` field, bypass
// AvatarKAccount entirely.
const RAIL_SECTIONS: { id: Section; label: string; tab?: AccountTabKey }[] = [
  { id: 'profile', label: 'Profile', tab: 'profile' },
  { id: 'products', label: 'Products', tab: 'products' },
  { id: 'access', label: 'Access', tab: 'access' },
  { id: 'membership', label: 'Membership', tab: 'membership' },
  { id: 'organizations', label: 'Organizations', tab: 'organizations' },
  { id: 'livingWorlds', label: 'Living Worlds', tab: 'livingWorlds' },
  { id: 'preferences', label: 'Preferences', tab: 'preferences' },
  { id: 'notifications', label: 'Notifications', tab: 'notifications' },
  { id: 'privacy', label: 'Privacy', tab: 'privacy' },
  { id: 'security', label: 'Security', tab: 'signin' },
  { id: 'systemInformation', label: 'Platform Health', tab: 'systemInformation' },
  { id: 'data', label: 'Data & Export', tab: 'data' },
  { id: 'extension-demo', label: 'Mock Extension', tab: extensionTabKey('mock-extension') },
  { id: 'journey', label: 'Experience' },
  { id: 'timeline', label: 'Timeline' },
]

function tabToSection(tab: AccountTabKey): Section | null {
  return RAIL_SECTIONS.find((s) => s.tab === tab)?.id ?? null
}

const SECTION_IDS = new Set(RAIL_SECTIONS.map((s) => s.id))
function isSection(value: string | null): value is Section {
  return !!value && SECTION_IDS.has(value as Section)
}

function DevAccountPreview() {
  // ?section= is read once for the initial screenshot deep-link only (a
  // convenience for automated visual verification); in-page navigation
  // after that is local state, same as the real /account page's URL-driven
  // nav but simplified since this tool has no router of its own.
  const searchParams = useSearchParams()
  const requestedSection = searchParams.get('section')
  const [section, setSection] = useState<Section>(isSection(requestedSection) ? requestedSection : 'profile')
  const activeRailSection = RAIL_SECTIONS.find((s) => s.id === section)
  // Optional ?dev_user= override for the 'journey'/'timeline' sections
  // only -- lets Playwright address a guaranteed-fresh id on the same
  // in-memory dev singletons for a deterministic empty-state screenshot,
  // without affecting the default dev-preview-user id every other
  // section (including the mock-adapter-backed ones) still uses.
  const devUser = searchParams.get('dev_user') ?? undefined

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12" style={{ background: 'var(--midnight)', color: 'var(--paper)', minHeight: '100vh' }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--gold)' }}>
        Identity RC1.1 — dev-only account preview (mock adapters, not a real session)
      </p>

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
        .echo-account-embed .aka-tablist { display: none; }
      `}</style>

      <div className="avatark-account-header flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--surface-line)' }}>
        <div className="flex items-center gap-3">
          <IdentityBadge displayName={mockPrincipal.displayName} roles={['admin']} />
          <MembershipBadge plan="free" />
        </div>
        <div className="flex items-center gap-3">
          <ProductSwitcher products={PRODUCT_REGISTRY} currentProductId="avatark" onSelect={() => {}} />
          <AvatarMenu displayName={mockPrincipal.displayName} email={mockPrincipal.email} onSignOut={() => {}} />
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
                onClick={() => setSection(item.id)}
                aria-current={active ? 'page' : undefined}
                className="whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: active ? 'color-mix(in srgb, var(--gold) 14%, transparent)' : 'transparent',
                  color: active ? 'var(--gold)' : 'var(--paper)',
                  outlineColor: 'var(--gold)',
                }}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="min-w-0 flex-1">
          {section === 'journey' ? (
            <ExperienceView apiBase={DEV_API_BASE} devUser={devUser} />
          ) : section === 'timeline' ? (
            <TimelineView apiBase={DEV_API_BASE} devUser={devUser} />
          ) : (
            <div className="echo-account-embed">
              <AccountAdaptersProvider adapters={mockAdapters}>
                <AvatarKAccount
                  principal={mockPrincipal}
                  currentProduct="avatark"
                  productName="AvatarK"
                  activeTab={activeRailSection?.tab}
                  onActiveTabChange={(next) => {
                    const nextSection = tabToSection(next)
                    if (nextSection) setSection(nextSection)
                  }}
                  onSignedOut={() => {}}
                />
              </AccountAdaptersProvider>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function DevAccountPreviewPage() {
  return (
    <Suspense fallback={null}>
      <DevAccountPreview />
    </Suspense>
  )
}
