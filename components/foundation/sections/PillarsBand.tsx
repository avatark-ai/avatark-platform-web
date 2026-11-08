import { APPROVED_COPY as C } from '@/lib/content/institutionalCopy'
import { SectionContainer } from '@/components/foundation/Container'

// AVK-UNIFICATION-02 (AVK-FR-030..044; AVK-DT4H-SETPOINT-01 amends 032/034/035): AvatarK Holdings' four corporate
// pillars. Kept visually and conceptually separate from the Canon's Four Axes
// (CanonPreview): no figures, no geometry, no axis styling -- the pillars
// organize the company's work; the axes are the Canon's geometry of becoming.
export const PILLARS = [
  { code: C['AVK-FR-033'], name: C['AVK-FR-034-A'], line: C['AVK-FR-035-A'] },
  { code: C['AVK-FR-036'], name: C['AVK-FR-037'], line: C['AVK-FR-038'] },
  { code: C['AVK-FR-039'], name: C['AVK-FR-040'], line: C['AVK-FR-041'] },
  { code: C['AVK-FR-042'], name: C['AVK-FR-043'], line: C['AVK-FR-044'] },
] as const

export function PillarsBand() {
  return (
    <section id="pillars" aria-labelledby="pillars-heading" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <SectionContainer className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
          {C['AVK-FR-030']}
        </p>
        <h2 id="pillars-heading" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {C['AVK-FR-031']}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
          {C['AVK-FR-032-A']}
        </p>

        <ul className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <li
              key={pillar.code}
              className="rounded-md border p-5"
              style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
            >
              <p className="text-sm font-semibold tracking-wider" style={{ color: 'var(--ink)' }}>
                {pillar.code}
              </p>
              <h3 className="mt-1 text-base font-semibold leading-6" style={{ color: 'var(--ink)' }}>
                {pillar.name}
              </h3>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
                {pillar.line}
              </p>
            </li>
          ))}
        </ul>
      </SectionContainer>
    </section>
  )
}
