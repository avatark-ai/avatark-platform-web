import { SectionContainer } from '@/components/foundation/Container'
import { LIVING_WORLDS_COPY as L } from '@/lib/content/livingWorldsCopy'

// AVK-FOUNDER-LIVING-WORLDS-02 (AVK-FLW-EC-01..07, EC-09, EC-10): one static
// "Living Worlds" section on /ecosystem with a single WorldK card. Not a
// registry-driven GrowthEngineCard -- WorldK is not in packages/product-registry
// (OD-12 gate). No maturity label, no link, no worldk.ai URL, no entry link; the
// pill is inert. AVK-FLW-EC-08 is withheld pending StreamK/CinemaK
// acknowledgement, so EC-09 follows the card directly.
export function EcosystemLivingWorlds() {
  return (
    <section
      id="living-worlds"
      aria-labelledby="ecosystem-living-worlds-heading"
      className="scroll-mt-4 border-t"
      style={{ borderColor: 'var(--paper-line)' }}
    >
      <SectionContainer className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
          {L['AVK-FLW-EC-01']}
        </p>
        <h2 id="ecosystem-living-worlds-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {L['AVK-FLW-EC-02']}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
          {L['AVK-FLW-EC-03']}
        </p>

        <div
          data-testid="worldk-card"
          className="mx-auto mt-8 max-w-md rounded-lg border p-5 text-left"
          style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
              {L['AVK-FLW-EC-04']}
            </h3>
            <span
              className="inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold"
              style={{ borderColor: 'var(--paper-line)', color: 'var(--ink)' }}
            >
              {L['AVK-FLW-EC-06']}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
            {L['AVK-FLW-EC-05']}
          </p>
          <p className="mt-2 text-sm font-medium leading-6" style={{ color: 'var(--ink)' }}>
            {L['AVK-FLW-EC-07']}
          </p>
          <p className="mt-4">
            <span
              data-testid="living-forest-inert-pill"
              className="inline-block rounded-full border px-4 py-1.5 text-sm font-semibold"
              style={{ borderColor: 'var(--paper-line)', color: 'var(--ink-dim)' }}
            >
              {L['AVK-FLW-EC-10']}
            </span>
          </p>
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {L['AVK-FLW-EC-09']}
        </p>
      </SectionContainer>
    </section>
  )
}
