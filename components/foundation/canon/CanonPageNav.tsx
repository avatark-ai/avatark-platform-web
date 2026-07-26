'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CanonNavItem } from '@/lib/content/canonNav'
import { CANON_INTERNAL_SECTION_IDS } from '@/lib/content/canonNav'

// Same slim, sticky-on-desktop / horizontal-scroll-on-mobile treatment as
// FounderPageNav.tsx, extended to track scroll position for the two
// in-page sections (Four Axes, Living Spiral) via IntersectionObserver --
// "Overview" is active whenever neither section is in view. Deep links to
// canon.avatark.ai are plain external anchors: no client-side active state
// applies once the user has left this site.
export function CanonPageNav({ items }: { items: CanonNavItem[] }) {
  const [activeId, setActiveId] = useState<string>('overview')

  useEffect(() => {
    const sections = CANON_INTERNAL_SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (sections.length === 0) return

    // rootMargin pulls the "trigger line" up near the sticky header
    // (top-24 = 96px) and ignores the bottom 60% of the viewport, so a
    // section only becomes active once it's genuinely the one being read.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length === 0) return
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
        setActiveId(topMost.target.id)
      },
      { rootMargin: '-96px 0px -60% 0px', threshold: 0 }
    )
    sections.forEach((section) => observer.observe(section))

    const firstSection = sections[0]
    const topObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0) {
          setActiveId('overview')
        }
      },
      { rootMargin: '-96px 0px 0px 0px', threshold: 0 }
    )
    topObserver.observe(firstSection)

    return () => {
      observer.disconnect()
      topObserver.disconnect()
    }
  }, [])

  return (
    <nav
      aria-label="Canon navigation"
      className="flex flex-row flex-nowrap gap-x-5 overflow-x-auto border-b pb-4 lg:sticky lg:top-24 lg:flex-col lg:items-start lg:gap-y-3 lg:self-start lg:overflow-visible lg:border-b-0 lg:pb-0"
      style={{ borderColor: 'var(--paper-line)' }}
    >
      {items.map((item) => {
        if (item.type === 'internal-anchor') {
          const active = item.id === activeId
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className="shrink-0 rounded-sm text-sm font-medium transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: active ? 'var(--gold)' : 'var(--ink-dim)', outlineColor: 'var(--gold)' }}
            >
              {item.label}
            </Link>
          )
        }

        return (
          <a
            key={item.id}
            href={item.href}
            aria-label={`${item.label} (opens canon.avatark.ai)`}
            className="inline-flex shrink-0 items-center gap-1 rounded-sm text-sm font-medium transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--ink-dim)', outlineColor: 'var(--gold)' }}
          >
            {item.label}
            <span aria-hidden="true" className="text-xs" style={{ color: 'var(--gold)' }}>
              ↗
            </span>
          </a>
        )
      })}
    </nav>
  )
}
