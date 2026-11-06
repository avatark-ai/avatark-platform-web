import Link from 'next/link'
import { APPROVED_COPY as C } from '@/lib/content/institutionalCopy'
import { LIVING_WORLDS_COPY as L } from '@/lib/content/livingWorldsCopy'
import { SectionContainer } from '@/components/foundation/Container'

// AVK-UNIFICATION-02 (AVK-FR-020..027): Living Worlds discovery band.
// Stage A discovery only: the "Discover Living Forest — Opening soon" pill is
// deliberately inert -- plain text, no href, no handler -- until WorldK
// confirms public release and Central Command authorizes the link
// (WORLDK-HANDOFF-01). Never an embed, never an /enter or world-entry link.
// The header's "Living Worlds" item targets this section's id.
export function LivingWorldsBand() {
  return (
    <section
      id="living-worlds"
      aria-labelledby="living-worlds-heading"
      className="scroll-mt-4 border-b"
      style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
    >
      <SectionContainer className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
          {C['AVK-FR-020']}
        </p>
        <h2 id="living-worlds-heading" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {C['AVK-FR-021']}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-8" style={{ color: 'var(--ink)' }}>
          {C['AVK-FR-022']}
        </p>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
          {C['AVK-FR-023']}
        </p>

        <p className="mt-8">
          <span
            data-testid="living-forest-inert-pill"
            className="inline-block rounded-full border px-5 py-2 text-sm font-semibold"
            style={{ borderColor: 'var(--paper-line)', color: 'var(--ink-dim)' }}
          >
            {C['AVK-FR-024']} {C['AVK-FR-025']}
          </span>
        </p>

        <p className="mx-auto mt-6 max-w-xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {C['AVK-FR-026']}
        </p>
        <p className="mx-auto mt-1 max-w-xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {C['AVK-FR-027']}
        </p>

        {/* AVK-FOUNDER-LIVING-WORLDS-02 (AVK-FLW-HM-01): internal link to the
            /foundation explanation. Placed after FR-027 so the owner-reviewed
            U-02D band order is unchanged. Never a WorldK or entry link. */}
        <p className="mt-6">
          <Link
            href="/foundation#living-worlds"
            className="inline-block rounded-sm text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--ink)', outlineColor: 'var(--focus-ring)' }}
          >
            {L['AVK-FLW-HM-01']}
          </Link>
        </p>
      </SectionContainer>
    </section>
  )
}
