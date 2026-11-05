import { SectionContainer } from '@/components/foundation/Container'
import { PrinciplesPanel } from '@/components/foundation/livingWorlds/PrinciplesPanel'
import { UNIFICATION_COPY as U } from '@/lib/content/unificationCopy'
import { LIVING_WORLD_PRINCIPLES, PRINCIPLES_HEADING_ID, PRINCIPLES_INTRO_ID } from '@/lib/content/livingWorldsPrinciples'

// AVK-UNIFICATION-03C-1 (LIVING-WORLDS-PAGE-V1 §3): "What makes a world living?". The intro
// AVK-U03-LW-11-R ("…not features available to visitors today.") is mandatory, sits outside the
// panel and is never collapsed (R-U4): the six principles are design intent, never presented as live
// capabilities. Six items -- kept visually apart from the Canon's Four Axes (no geometry, no figures).
export function WhatMakesAWorldLiving() {
  const items = LIVING_WORLD_PRINCIPLES.map((p) => ({ key: p.key, name: U[p.nameId], body: U[p.bodyId] }))
  return (
    <section id="what-makes-a-world-living" aria-labelledby="principles-heading" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <SectionContainer>
        <div className="mx-auto max-w-[var(--editorial-width)] text-center">
          <h2 id="principles-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {U[PRINCIPLES_HEADING_ID]}
          </h2>
          <p data-testid="principles-intro" className="mt-4 text-lg leading-8" style={{ color: 'var(--ink-dim)' }}>
            {U[PRINCIPLES_INTRO_ID]}
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-[var(--content-width)]">
          <PrinciplesPanel items={items} label={U[PRINCIPLES_HEADING_ID]} />
        </div>
      </SectionContainer>
    </section>
  )
}
