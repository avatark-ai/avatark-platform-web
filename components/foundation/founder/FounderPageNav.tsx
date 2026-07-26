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
      className="flex flex-row flex-nowrap gap-x-5 overflow-x-auto border-b pb-4 lg:sticky lg:top-24 lg:flex-col lg:gap-y-3 lg:self-start lg:overflow-visible lg:border-b-0 lg:pb-0"
      style={{ borderColor: 'var(--paper-line)' }}
    >
      {items.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className="shrink-0 rounded-sm text-sm font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: active ? 'var(--gold)' : 'var(--ink-dim)', outlineColor: 'var(--gold)' }}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
