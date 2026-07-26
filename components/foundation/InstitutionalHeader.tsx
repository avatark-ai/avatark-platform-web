'use client'

// The institutional AvatarK.ai nav -- distinct from the Echo consumer
// app-shell's own header/footer (components/echo/shell/EchoShell.tsx,
// EchoHeader.tsx). That one keeps running, unchanged, on /start, /journey,
// /account, /enter, etc. This one only renders on the institutional pages
// (/, /foundation, /canon and its sub-routes, /founder and its sub-routes,
// /ecosystem, /roadmap) -- EchoShell.isInstitutionalOnlyPath() self-excludes
// there so the two shells never stack.
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ENTER_ECHO_HREF, SIGN_IN_HREF } from '@/lib/content/links'

const LINK_CLASS =
  'rounded-sm text-sm font-medium tracking-tight transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
const FOCUS_STYLE = { outlineColor: 'var(--gold)' } as const

// Foundation and Canon are now dedicated pages, not homepage anchors --
// one flat nav array, same treatment for every item, exact-match active
// state (no more anchor-vs-route branching).
const NAV_ITEMS = [
  { label: 'Foundation', href: '/foundation' },
  { label: 'Canon', href: '/canon' },
  { label: 'Ecosystem', href: '/ecosystem' },
  { label: 'Founder', href: '/founder' },
] as const

function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href
}

export function InstitutionalHeader() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setMobileOpen(false)
  }

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
                  className={LINK_CLASS}
                  style={{ color: active ? 'var(--gold)' : 'var(--paper)', ...FOCUS_STYLE }}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="hidden items-center gap-4 lg:flex">
            <Link href={SIGN_IN_HREF} className={LINK_CLASS} style={{ color: 'var(--paper)', ...FOCUS_STYLE }}>
              Sign In
            </Link>
            <Link
              href={ENTER_ECHO_HREF}
              className="rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: 'var(--gold)', color: 'var(--midnight)', ...FOCUS_STYLE }}
            >
              Enter Echo →
            </Link>
          </div>

          <button
            type="button"
            className="rounded-sm lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
          id="mobile-nav"
          aria-label="Primary"
          className="flex flex-col gap-1 border-t px-6 py-4 lg:hidden"
          style={{ borderColor: 'var(--surface-line)' }}
        >
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(pathname, item.href)
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`py-2 ${LINK_CLASS}`}
                style={{ color: active ? 'var(--gold)' : 'var(--paper)', ...FOCUS_STYLE }}
              >
                {item.label}
              </Link>
            )
          })}

          <Link
            href={SIGN_IN_HREF}
            onClick={() => setMobileOpen(false)}
            className={`py-2 ${LINK_CLASS}`}
            style={{ color: 'var(--paper)', ...FOCUS_STYLE }}
          >
            Sign In
          </Link>
          <Link
            href={ENTER_ECHO_HREF}
            onClick={() => setMobileOpen(false)}
            className="mt-2 rounded-md px-4 py-2 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: 'var(--gold)', color: 'var(--midnight)', ...FOCUS_STYLE }}
          >
            Enter Echo →
          </Link>
        </nav>
      )}
    </header>
  )
}
