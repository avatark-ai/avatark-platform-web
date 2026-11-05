'use client'

// The institutional AvatarK.ai nav -- distinct from the Echo consumer
// app-shell's own header/footer (components/echo/shell/EchoShell.tsx,
// EchoHeader.tsx). That one keeps running, unchanged, on /start, /journey,
// /account, /enter, etc. This one only renders on the institutional pages
// (/, /foundation, /canon and its sub-routes, /founder and its sub-routes,
// /ecosystem, /living-worlds, /roadmap) -- EchoShell.isInstitutionalOnlyPath() self-excludes
// there so the two shells never stack.
//
// AVK-UNIFICATION-03B (HEADER-AND-MOBILE-NAV-V3): order Foundation · Living Worlds · Canon ·
// Ecosystem · Founder, then the Explore disclosure, which replaces the gold "Enter Echo →" button
// (D-U03-04; Echo stays reachable as Explore → Explore Echo -> /start). Sign In stays separately
// gated by INSTITUTIONAL_SIGNIN_ENABLED (off unless 'true') and is never inside Explore. New
// behaviour (did not exist before U-03B): the mobile drawer closes on Escape and returns focus to the
// toggle, and moves focus to its first link on open.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ENTER_ECHO_HREF, SIGN_IN_HREF } from '@/lib/content/links'
import { INSTITUTIONAL_SIGNIN_ENABLED } from '@/lib/content/flags'
import { ExploreMenu } from '@/components/foundation/ExploreMenu'
import { EXPLORE_LABEL, exploreItems, primaryNavItems } from '@/components/foundation/institutionalNav'

const LINK_CLASS =
  'rounded-sm text-sm font-medium tracking-tight transition-colors duration-200 hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
const FOCUS_STYLE = { outlineColor: 'var(--gold)' } as const

const NAV_ITEMS = primaryNavItems()
const EXPLORE_ITEMS = exploreItems(ENTER_ECHO_HREF)

function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href
}

export function InstitutionalHeader() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)

  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setMobileOpen(false)
  }

  useEffect(() => {
    if (!mobileOpen) return
    drawerRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  return (
    <header style={{ borderBottom: '1px solid var(--surface-line)', background: 'var(--midnight)' }}>
      <div className="relative mx-auto max-w-[var(--shell-width)] px-6">
        <div className="flex items-center justify-between py-4">
          <Link
            href="/"
            className="rounded-sm text-base font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--paper)', ...FOCUS_STYLE }}
            onClick={() => setMobileOpen(false)}
          >
            AvatarK
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
            {NAV_ITEMS.map((item) => {
              const active = isNavItemActive(pathname, item.href)
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`whitespace-nowrap ${LINK_CLASS}`}
                  style={{ color: active ? 'var(--gold)' : 'var(--paper)', ...FOCUS_STYLE }}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            {INSTITUTIONAL_SIGNIN_ENABLED && (
              <Link href={SIGN_IN_HREF} className={LINK_CLASS} style={{ color: 'var(--paper)', ...FOCUS_STYLE }}>
                Sign In
              </Link>
            )}
            <ExploreMenu label={EXPLORE_LABEL} items={EXPLORE_ITEMS} pathname={pathname} />
          </div>

          <button
            ref={toggleRef}
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-sm lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((open) => !open)}
            style={{ color: 'var(--paper)', ...FOCUS_STYLE }}
          >
            <span aria-hidden="true">{mobileOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          ref={drawerRef}
          id="mobile-nav"
          aria-label="Primary"
          className="motion-emerge-instant flex flex-col gap-1 border-t px-6 py-4 lg:hidden"
          style={{ borderColor: 'var(--surface-line)' }}
        >
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isNavItemActive(pathname, item.href)
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`block py-3 ${LINK_CLASS}`}
                    style={{ color: active ? 'var(--gold)' : 'var(--paper)', ...FOCUS_STYLE }}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <p
            id="mobile-explore-label"
            className="mt-3 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-dim)' }}
          >
            {EXPLORE_LABEL}
          </p>
          <ul aria-labelledby="mobile-explore-label" className="flex flex-col gap-1 pl-3">
            {EXPLORE_ITEMS.map((item) => {
              const active = isNavItemActive(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`block py-3 ${LINK_CLASS}`}
                    style={{ color: active ? 'var(--gold)' : 'var(--paper)', ...FOCUS_STYLE }}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          {INSTITUTIONAL_SIGNIN_ENABLED && (
            <Link
              href={SIGN_IN_HREF}
              onClick={() => setMobileOpen(false)}
              className={`py-3 ${LINK_CLASS}`}
              style={{ color: 'var(--paper)', ...FOCUS_STYLE }}
            >
              Sign In
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}
