import { SectionContainer } from '@/components/foundation/Container'
import { StatusPill } from '@/components/foundation/StatusPill'
import { LivingForestGeometry } from '@/components/foundation/geometry/LivingForestGeometry'
import { APPROVED_COPY as C } from '@/lib/content/institutionalCopy'
import { LIVING_WORLDS_COPY as L } from '@/lib/content/livingWorldsCopy'

// AVK-UNIFICATION-03C §2: the first world. Every string is reused approved copy. The "Discover Living
// Forest — Opening soon" pill is the same inert <span> as the former homepage band (and /ecosystem):
// no href, no handler, no role -- it only becomes a link through a separate Stage A authorization gate
// (WORLDK-HANDOFF-01). No VANAM imagery (WorldK-only rights) until M-01 is cleared.
// AVK-VISUAL-01B (OD-V4): the empty typographic well becomes a code-drawn geometry panel (4:3, max
// 420px from lg) that keeps the approved "Living Forest" small-caps label. Decorative, aria-hidden.
export function LivingForestFeature() {
  return (
    <section
      id="living-forest"
      aria-labelledby="living-forest-heading"
      className="scroll-mt-4 border-b"
      style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
    >
      <SectionContainer className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div
          aria-hidden="true"
          data-testid="living-forest-geometry-panel"
          className="relative flex aspect-[4/3] w-full items-end justify-center rounded-2xl border pb-6 lg:order-2 lg:max-h-[420px]"
          style={{ borderColor: 'var(--paper-line)', background: 'var(--paper)' }}
        >
          <LivingForestGeometry className="absolute inset-x-8 top-8 bottom-14 h-[calc(100%-5.5rem)] w-[calc(100%-4rem)]" />
          <span className="relative text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--ink-dim)' }}>
            {C['AVK-FR-021']}
          </span>
        </div>
        <div className="lg:order-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
            {C['AVK-FR-020']}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 id="living-forest-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {C['AVK-FR-021']}
            </h2>
            <StatusPill text={L['AVK-FLW-ST-01']} tier="IN DEVELOPMENT" />
          </div>
          <p className="mt-4 text-lg leading-8" style={{ color: 'var(--ink)' }}>
            {C['AVK-FR-022']}
          </p>
          <p className="mt-4 text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
            {C['AVK-FR-023']}
          </p>
          <p className="mt-4 text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
            {L['AVK-FLW-LW-11']}
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
          <p className="mt-6 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
            {C['AVK-FR-027']}
          </p>
          <p className="mt-1 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
            {L['AVK-FLW-LW-19']}
          </p>
        </div>
      </SectionContainer>
    </section>
  )
}
