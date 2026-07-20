'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { resolveClientPrincipal, type ClientPrincipalResult } from '@/lib/auth/resolveClientPrincipal'
import { getActivityCards, type ActivityCard } from '@/lib/activities/registry'

// Same flag app/account/page.tsx reads -- the nav must not offer a link
// into Account when this deployment hasn't mounted it, rather than
// pointing at a page that only ever says "not yet available".
const ACCOUNT_MOUNT_ENABLED = process.env.NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED === 'true'

const LINK_CLASS =
  'text-sm font-medium transition-colors hover:text-[var(--gold)] rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
const FOCUS_STYLE = { outlineColor: 'var(--gold)' } as const

function ActivityLink({ card, onNavigate }: { card: ActivityCard; onNavigate?: () => void }) {
  // Coming-soon Activities still get a real nav entry -- they just point at
  // their own honest section on the home page instead of a fabricated
  // destination, so nothing here is ever a dead link.
  const href = card.href ?? `/#${card.id}`
  if (href.startsWith('http')) {
    return (
      <a href={href} className={LINK_CLASS} style={{ color: 'var(--paper)', ...FOCUS_STYLE }} onClick={onNavigate}>
        {card.label}
      </a>
    )
  }
  return (
    <Link href={href} className={LINK_CLASS} style={{ color: 'var(--paper)', ...FOCUS_STYLE }} onClick={onNavigate}>
      {card.label}
    </Link>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const [principal, setPrincipal] = useState<ClientPrincipalResult | { status: 'loading' }>({ status: 'loading' })
  const [mobileOpen, setMobileOpen] = useState(false)
  // Close the mobile menu on route change (e.g. browser back/forward) even
  // when nothing called closeMobile() directly -- adjusted during render,
  // per React's guidance, rather than in an effect.
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setMobileOpen(false)
  }

  useEffect(() => {
    let cancelled = false
    resolveClientPrincipal().then((result) => {
      if (!cancelled) setPrincipal(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Platform admin renders its own separate nav (AdminNav) -- this
  // consumer header must never stack on top of or merge with it.
  if (pathname.startsWith('/admin')) return null

  const activities = getActivityCards()
  const signedIn = principal.status === 'signed_in'
  const closeMobile = () => setMobileOpen(false)

  return (
    <header style={{ borderBottom: '1px solid var(--surface-line)', background: 'var(--midnight)' }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="rounded-sm text-base font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--paper)', ...FOCUS_STYLE }}
        >
          AvatarK
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {activities.map((card) => (
            <ActivityLink key={card.id} card={card} />
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {signedIn ? (
            <>
              <Link href="/journey" className={LINK_CLASS} style={{ color: 'var(--paper)', ...FOCUS_STYLE }}>
                Continue
              </Link>
              {ACCOUNT_MOUNT_ENABLED && (
                <Link href="/account" className={LINK_CLASS} style={{ color: 'var(--paper)', ...FOCUS_STYLE }}>
                  Account
                </Link>
              )}
            </>
          ) : principal.status !== 'loading' ? (
            <Link
              href="/auth/sign-in"
              className="rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: 'var(--gold)', color: 'var(--midnight)', ...FOCUS_STYLE }}
            >
              Sign in
            </Link>
          ) : null}
        </div>

        <button
          type="button"
          className="rounded-sm md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((open) => !open)}
          style={{ color: 'var(--paper)', ...FOCUS_STYLE }}
        >
          <span aria-hidden="true">{mobileOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="flex flex-col gap-1 border-t px-6 py-4 md:hidden"
          style={{ borderColor: 'var(--surface-line)' }}
        >
          {activities.map((card) => (
            <span key={card.id} className="py-2">
              <ActivityLink card={card} onNavigate={closeMobile} />
            </span>
          ))}
          {signedIn ? (
            <>
              <Link href="/journey" onClick={closeMobile} className={`py-2 ${LINK_CLASS}`} style={{ color: 'var(--paper)', ...FOCUS_STYLE }}>
                Continue
              </Link>
              {ACCOUNT_MOUNT_ENABLED && (
                <Link href="/account" onClick={closeMobile} className={`py-2 ${LINK_CLASS}`} style={{ color: 'var(--paper)', ...FOCUS_STYLE }}>
                  Account
                </Link>
              )}
            </>
          ) : principal.status !== 'loading' ? (
            <Link
              href="/auth/sign-in"
              onClick={closeMobile}
              className="rounded-sm py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: 'var(--gold)', ...FOCUS_STYLE }}
            >
              Sign in
            </Link>
          ) : null}
        </nav>
      )}
    </header>
  )
}
