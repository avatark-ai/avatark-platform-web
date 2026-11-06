'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface FounderPageNavItem {
  id: string
  label: string
  href: string
}

// The Founder experience is three separate routes now, not one scrolling
// page with in-page anchors -- active state is route-based (matches the
// same isNavItemActive pattern InstitutionalHeader.tsx already uses), not
// IntersectionObserver scroll-spy. Same left-side, sticky-on-desktop visual
// treatment as before; "no oversized sticky sidebar" just means this stays
// a slim link list, not a redesign of the position itself.
export function FounderPageNav({ items }: { items: FounderPageNavItem[] }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Founder pages"
      className="flex min-w-0 flex-row flex-nowrap gap-x-5 overflow-x-auto border-b pb-4 lg:sticky lg:top-24 lg:flex-col lg:gap-y-3 lg:self-start lg:overflow-visible lg:border-b-0 lg:pb-0"
      style={{ borderColor: 'var(--paper-line)' }}
    >
      {items.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            // AVK-PROD-A11Y-01B (A11Y-06, D-3): same active treatment as CanonRail.
            className={`shrink-0 rounded-none border-b-2 text-sm transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:-ml-3 lg:border-b-0 lg:border-l-2 lg:pl-2.5 ${active ? 'font-semibold' : 'font-medium'}`}
            style={{ color: active ? 'var(--ink)' : 'var(--ink-dim)', borderColor: active ? 'var(--gold-ink)' : 'transparent', outlineColor: 'var(--focus-ring)' }}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
