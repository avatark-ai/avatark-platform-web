import Link from 'next/link'
import { SectionContainer } from '@/components/foundation/Container'
import { LIVING_WORLDS_COPY as L } from '@/lib/content/livingWorldsCopy'
import { FOUNDER_WHY_LIVING_WORLDS_HREF } from '@/components/foundation/sections/FoundationLivingWorlds'

// AVK-UNIFICATION-03C §6: points to the approved Foundation and Founder explanations instead of
// repeating them. FD-04 stays single-sourced on /foundation; FD-05 is omitted because its "that path"
// needs FD-04 (D-U03-09). Internal links only.
export const WHY_LIVING_WORLDS_LINKS = [
  { id: 'AVK-FLW-HM-01', href: '/foundation#living-worlds' },
  { id: 'AVK-FLW-FD-08', href: FOUNDER_WHY_LIVING_WORLDS_HREF },
] as const

export function WhyLivingWorlds() {
  return (
    <section id="why-living-worlds" aria-labelledby="why-living-worlds-heading" style={{ background: 'var(--midnight)', color: 'var(--paper)' }}>
      <SectionContainer className="flex flex-col items-center gap-6 text-center">
        <h2 id="why-living-worlds-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {L['AVK-FLW-FD-02']}
        </h2>
        <p className="text-xl leading-8" style={{ color: 'var(--text-dim)' }}>
          {L['AVK-FLW-FD-03']}
        </p>
        <ul className="flex flex-col items-center gap-3 sm:flex-row sm:gap-8">
          {WHY_LIVING_WORLDS_LINKS.map((l) => (
            <li key={l.id}>
              <Link
                href={l.href}
                className="inline-block rounded-sm py-2 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: 'var(--paper)', outlineColor: 'var(--gold)' }}
              >
                {L[l.id]}
              </Link>
            </li>
          ))}
        </ul>
      </SectionContainer>
    </section>
  )
}
