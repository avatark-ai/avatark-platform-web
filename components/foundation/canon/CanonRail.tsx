'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { CANON_FUTURE_ITEMS, CANON_INTERNAL_SECTION_IDS, CANON_NAV_ITEMS, type CanonNavItem } from '@/lib/content/canonNav'

const PUBLISHED_ITEMS = CANON_NAV_ITEMS.filter((item) => item.group === 'published')
const FULL_CANON_ITEM = CANON_NAV_ITEMS.find((item) => item.group === 'full-canon')

// The persistent left rail used by every /canon/* route (see
// CanonPageLayout.tsx). Three groups, same as the Canon rail spec:
// Published routes/anchors, "More in the Canon" future chapters (visible,
// muted, never linked), and a single Full Canon fallback.
//
// Active state is route-based for real pages (Sacred Geometry, Operators,
// Dynamics, Alignment) via usePathname, same pattern as
// InstitutionalHeader/FounderPageNav. The two in-page anchors on /canon
// itself (Four Axes, Living Spiral) still need scroll-spy, since they don't
// have their own route -- that IntersectionObserver only attaches while
// pathname === '/canon'.
export function CanonRail() {
  const pathname = usePathname()
  const [activeSectionId, setActiveSectionId] = useState<string>('overview')

  useEffect(() => {
    if (pathname !== '/canon') return

    const sections = CANON_INTERNAL_SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length === 0) return
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
        setActiveSectionId(topMost.target.id)
      },
      { rootMargin: '-96px 0px -60% 0px', threshold: 0 }
    )
    sections.forEach((section) => observer.observe(section))

    const firstSection = sections[0]
    const topObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0) {
          setActiveSectionId('overview')
        }
      },
      { rootMargin: '-96px 0px 0px 0px', threshold: 0 }
    )
    topObserver.observe(firstSection)

    return () => {
      observer.disconnect()
      topObserver.disconnect()
    }
  }, [pathname])

  function isActive(item: CanonNavItem): boolean {
    if (item.id === 'overview') return pathname === '/canon' && activeSectionId === 'overview'
    if (item.id === 'four-axes' || item.id === 'living-spiral') return pathname === '/canon' && activeSectionId === item.id
    if (!item.institutionalHref) return false
    if (item.activeMatch === 'exact') return pathname === item.institutionalHref
    if (item.activeMatch === 'prefix') return pathname === item.institutionalHref || pathname.startsWith(`${item.institutionalHref}/`)
    return false
  }

  return (
    <nav aria-label="Canon navigation" className="flex min-w-0 flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
      <div className="min-w-0">
        <p className="hidden text-xs font-semibold uppercase tracking-wider lg:mb-3 lg:block" style={{ color: 'var(--ink-dim)' }}>
          Published
        </p>
        <div
          className="flex min-w-0 flex-row flex-nowrap gap-x-5 overflow-x-auto border-b pb-4 lg:flex-col lg:items-start lg:gap-y-3 lg:overflow-visible lg:border-b-0 lg:pb-0"
          style={{ borderColor: 'var(--paper-line)' }}
        >
          {PUBLISHED_ITEMS.map((item) => {
            const active = isActive(item)
            return (
              <Link
                key={item.id}
                href={item.institutionalHref ?? '#'}
                aria-current={active ? 'page' : undefined}
                className="shrink-0 rounded-sm text-sm font-medium transition-colors duration-200 hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: active ? 'var(--gold)' : 'var(--ink-dim)', outlineColor: 'var(--gold)' }}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="min-w-0">
        <p
          className="text-xs font-semibold uppercase tracking-wider lg:mb-3"
          style={{ color: 'var(--ink-dim)', opacity: 0.75 }}
        >
          More in the Canon
        </p>
        <ul
          aria-label="Upcoming Canon chapters"
          className="flex min-w-0 flex-row flex-nowrap gap-x-5 overflow-x-auto pt-3 lg:flex-col lg:items-start lg:gap-y-2.5 lg:overflow-visible lg:pt-0"
        >
          {CANON_FUTURE_ITEMS.map((item) => (
            <li key={item.id} className="flex shrink-0 items-center gap-1.5 text-sm" style={{ color: 'var(--ink-dim)', opacity: 0.6 }}>
              <span>{item.label}</span>
              <span
                className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ borderColor: 'var(--paper-line)', color: 'var(--gold)' }}
              >
                Soon
              </span>
              <span className="sr-only">— this chapter of the Canon is forthcoming, not yet published</span>
            </li>
          ))}
        </ul>
      </div>

      {FULL_CANON_ITEM && FULL_CANON_ITEM.legacyHref && (
        <div className="border-t pt-5" style={{ borderColor: 'var(--paper-line)' }}>
          <a
            href={FULL_CANON_ITEM.legacyHref}
            aria-label={`${FULL_CANON_ITEM.label} (opens the complete Canon at canon.avatark.ai)`}
            className="link-underline-draw inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--gold)', outlineColor: 'var(--gold)' }}
          >
            {FULL_CANON_ITEM.label}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      )}
    </nav>
  )
}
