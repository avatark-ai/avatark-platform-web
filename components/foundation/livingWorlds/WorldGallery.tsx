import { SectionContainer } from '@/components/foundation/Container'
import { ExperienceCard } from '@/components/foundation/sections/ExperienceCard'
import { TypographicWell } from '@/components/foundation/TypographicWell'
import { UNIFICATION_COPY as U } from '@/lib/content/unificationCopy'
import { FUTURE_WORLD_CONCEPTS, FUTURE_WORLD_LABEL_ID } from '@/lib/content/livingWorldsGallery'

// AVK-UNIFICATION-03C §5 (WORLD-GALLERY-CONTRACT): three future concepts, titles + "Future concept"
// only. No anchors, buttons, handlers, tab stops, dates or WorldK attribution; neutral wells (no media
// cleared). The intro AVK-U03-LW-31 and descriptions LW-34/36/38 are PENDING and not rendered.
export function WorldGallery() {
  return (
    <section id="future-living-worlds" aria-labelledby="future-worlds-heading" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <SectionContainer>
        <h2 id="future-worlds-heading" className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          {U['AVK-U03-LW-30']}
        </h2>
        <ul role="list" data-testid="world-gallery" className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FUTURE_WORLD_CONCEPTS.map((w) => (
            <li key={w.key} data-world-concept={w.key}>
              <ExperienceCard
                variant="concept"
                titleId={`future-world-${w.key}-title`}
                title={U[w.titleId]}
                status={{ text: U[FUTURE_WORLD_LABEL_ID], tier: 'VISION' }}
                description={w.descriptionId ? U[w.descriptionId] : undefined}
                media={<TypographicWell className="aspect-video max-h-[200px] lg:aspect-[4/3] lg:max-h-none" background="var(--surface-card)" />}
              />
            </li>
          ))}
        </ul>
      </SectionContainer>
    </section>
  )
}

