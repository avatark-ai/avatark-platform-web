'use client'

import { useEffect, useState } from 'react'

export interface FounderChapterNavItem {
  id: string
  label: string
}

// Sticky on desktop, plain in-flow list on mobile ("normal scrolling", per
// the brief). Highlights the current chapter via IntersectionObserver --
// no smooth-scroll JS, no animation library, consistent with this repo's
// existing "no motion" sections (LivingSpiral, Canon's instant tab toggle).
export function FounderChapterNav({ items }: { items: FounderChapterNavItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null)

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length === 0) return
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b))
        setActiveId(topMost.target.id)
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0 },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [items])

  return (
    <nav
      aria-label="Founder chapters"
      className="flex flex-row flex-nowrap gap-x-5 overflow-x-auto border-b pb-4 lg:sticky lg:top-24 lg:flex-col lg:gap-y-3 lg:self-start lg:overflow-visible lg:border-b-0 lg:pb-0"
      style={{ borderColor: 'var(--paper-line)' }}
    >
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={active ? 'true' : undefined}
            className="shrink-0 rounded-sm text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: active ? 'var(--gold)' : 'var(--ink-dim)', outlineColor: 'var(--gold)' }}
          >
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}
