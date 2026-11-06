import Link from 'next/link'
import { UNIFICATION_COPY as U } from '@/lib/content/unificationCopy'
import { LIVING_WORLDS_HREF, LIVING_WORLDS_ROUTE_ENABLED } from '@/lib/content/livingWorldsRoute'
import { HeroJumpLink } from '@/components/foundation/sections/HeroJumpLink'

// AVK-UNIFICATION-03B (HOMEPAGE-HERO-V3): the institutional hero, modified in place (single caller,
// app/page.tsx). It no longer reads the headline/lines from architecture.md: that file is unchanged,
// the three lines now render in WhyAvatarK, and "The Architecture of Becoming" stays in metadata,
// /foundation and FD-04. The verbs are one plain run of text -- no breaks, numbering or per-word
// styling (R-U1). No motion.
//
// Hero has its own compact wrapper (not the shared EditorialContainer) -- it targets a specific
// ~520-600px desktop height, tighter than the shared section default.
export function Hero() {
  return (
    <section id="hero" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <div className="mx-auto flex w-full max-w-[var(--editorial-width)] flex-col items-center gap-7 px-6 py-14 text-center sm:py-16">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl">
          {U['AVK-U03-HH-01']}
        </h1>
        <div className="h-px w-16" style={{ background: 'var(--gold)' }} aria-hidden="true" />
        <p className="text-lg leading-8 sm:text-xl" style={{ color: 'var(--ink-dim)' }}>
          {U['AVK-U03-HH-02']}
        </p>
        <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
          <HeroJumpLink
            targetId="experiences"
            className="w-full rounded-md px-6 py-3 text-sm font-semibold transition hover:opacity-90 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
            style={{ background: 'var(--ink)', color: 'var(--paper)', outlineColor: 'var(--focus-ring)' }}
          >
            {U['AVK-U03-HH-04']}
          </HeroJumpLink>
          {/* Rendered only while the /living-worlds route is enabled (livingWorldsRoute.ts; on since U-03C). */}
          {LIVING_WORLDS_ROUTE_ENABLED && (
            <Link
              href={LIVING_WORLDS_HREF}
              className="rounded-sm px-2 py-1 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: 'var(--ink)', outlineColor: 'var(--focus-ring)' }}
            >
              {U['AVK-U03-HN-08']}
            </Link>
          )}
        </div>
        <p className="mt-8 text-xs uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
          {U['AVK-U03-HH-03']}
        </p>
      </div>
    </section>
  )
}
