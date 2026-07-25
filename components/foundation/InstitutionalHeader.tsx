'use client'

// The institutional AvatarK.ai nav -- distinct from components/SiteHeader.tsx,
// which is the shipped consumer app-shell's nav (Explore/Practice/Together/
// Watch activity links, Sign in/Continue/Account). That one keeps running,
// unchanged, on /start, /journey, /account, /enter, etc. This one only
// renders on the institutional pages (/, /founder, /roadmap) -- SiteHeader
// self-excludes there so the two never stack.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { EcosystemGroup } from '@/lib/content/ecosystemGroups'
import { ENTER_ECHO_HREF, SIGN_IN_HREF } from '@/lib/content/links'

const LINK_CLASS =
  'rounded-sm text-sm font-medium tracking-tight transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
const FOCUS_STYLE = { outlineColor: 'var(--gold)' } as const

const PRIMARY_NAV = [
  { label: 'Foundation', href: '/#gap' },
  { label: 'Canon', href: '/#canon' },
] as const

const SECONDARY_NAV = [
  { label: 'Founder', href: '/founder' },
  { label: 'Roadmap', href: '/roadmap' },
] as const

function EcosystemPanel({ groups, onNavigate }: { groups: EcosystemGroup[]; onNavigate: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
      {groups.map((group) => (
        <div key={group.id}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
            {group.label}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {group.products.map((product) => (
              <li key={product.id}>
                {product.href ? (
                  <a
                    href={product.href}
                    onClick={onNavigate}
                    className="rounded-sm text-sm transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ color: 'var(--paper)', ...FOCUS_STYLE }}
                  >
                    {product.name}
                  </a>
                ) : (
                  <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                    {product.name}
                    <span className="ml-1.5 text-xs">{product.isEcho ? '— not yet built' : '— coming soon'}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function InstitutionalHeader({ ecosystemGroups }: { ecosystemGroups: EcosystemGroup[] }) {
  const pathname = usePathname()
  const [ecosystemOpen, setEcosystemOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setEcosystemOpen(false)
    setMobileOpen(false)
  }

  useEffect(() => {
    if (!ecosystemOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setEcosystemOpen(false)
    }
    function onClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setEcosystemOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onClickOutside)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [ecosystemOpen])

  const closeAll = () => {
    setEcosystemOpen(false)
    setMobileOpen(false)
  }

  return (
    <header style={{ borderBottom: '1px solid var(--surface-line)', background: 'var(--midnight)' }}>
      <div className="relative mx-auto max-w-6xl px-6" ref={panelRef}>
        <div className="flex items-center justify-between py-4">
          <Link
            href="/"
            className="rounded-sm text-base font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--paper)', ...FOCUS_STYLE }}
            onClick={closeAll}
          >
            AvatarK
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
            {PRIMARY_NAV.map((item) => (
              <a key={item.label} href={item.href} className={LINK_CLASS} style={{ color: 'var(--paper)', ...FOCUS_STYLE }}>
                {item.label}
              </a>
            ))}

            <button
              type="button"
              className={`${LINK_CLASS} flex items-center gap-1`}
              style={{ color: 'var(--paper)', ...FOCUS_STYLE }}
              aria-expanded={ecosystemOpen}
              aria-controls="ecosystem-panel"
              onClick={() => setEcosystemOpen((open) => !open)}
            >
              Ecosystem
              <span aria-hidden="true" className="text-xs">
                {ecosystemOpen ? '▲' : '▼'}
              </span>
            </button>

            {SECONDARY_NAV.map((item) => (
              <Link key={item.label} href={item.href} className={LINK_CLASS} style={{ color: 'var(--paper)', ...FOCUS_STYLE }}>
                {item.label}
              </Link>
            ))}
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

        {ecosystemOpen && (
          <div
            id="ecosystem-panel"
            className="hidden border-t py-6 lg:block"
            style={{ borderColor: 'var(--surface-line)' }}
          >
            <EcosystemPanel groups={ecosystemGroups} onNavigate={closeAll} />
          </div>
        )}
      </div>

      {mobileOpen && (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="flex flex-col gap-1 border-t px-6 py-4 lg:hidden"
          style={{ borderColor: 'var(--surface-line)' }}
        >
          {PRIMARY_NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={closeAll}
              className={`py-2 ${LINK_CLASS}`}
              style={{ color: 'var(--paper)', ...FOCUS_STYLE }}
            >
              {item.label}
            </a>
          ))}

          <div className="py-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
              Ecosystem
            </p>
            <div className="mt-3">
              <EcosystemPanel groups={ecosystemGroups} onNavigate={closeAll} />
            </div>
          </div>

          {SECONDARY_NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={closeAll}
              className={`py-2 ${LINK_CLASS}`}
              style={{ color: 'var(--paper)', ...FOCUS_STYLE }}
            >
              {item.label}
            </Link>
          ))}

          <Link
            href={SIGN_IN_HREF}
            onClick={closeAll}
            className={`py-2 ${LINK_CLASS}`}
            style={{ color: 'var(--paper)', ...FOCUS_STYLE }}
          >
            Sign In
          </Link>
          <Link
            href={ENTER_ECHO_HREF}
            onClick={closeAll}
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
