import { RevealOnView } from '@avatark/motion'
import { SectionContainer } from '@/components/foundation/Container'
import { ExperienceCard } from '@/components/foundation/sections/ExperienceCard'
import { EchoMotif, WorldWell } from '@/components/foundation/sections/FeaturedExperiences'
import { ECOSYSTEM_WORLDK_COPY as E } from '@/lib/content/ecosystemWorldkCopy'
import { FOUNDER_SCIENCE_COPY as S } from '@/lib/content/founderScienceCopy'
import { LIVING_WORLDS_COPY as L } from '@/lib/content/livingWorldsCopy'
import { UNIFICATION_COPY as U } from '@/lib/content/unificationCopy'
import { LIVING_WORLDS_HREF } from '@/lib/content/livingWorldsRoute'

// AVK-ECOSYSTEM-WORLDK-02 (OD-EW-1/8/9): the two experience systems, Echo and WorldK, presented as equal
// peers directly after "How the parts relate" -- same ExperienceCard component, heading level, grid track and
// homepage motif treatment, Echo first (homepage order). Replaces EcosystemLivingWorlds on this page.
//
// Every string is existing approved copy or owner-approved EW copy. WorldK stays "In development", static and
// unregistered (OD-12): no WorldK host, no /enter, no registry lookup. Its only action is the internal
// /living-worlds route (OD-EW-9). Echo has no action: this page is the "Discover Echo" destination (#echo,
// OD-EW-6). Withheld: AVK-FLW-EC-08 (OD-EW-4), AVK-FLW-EC-11 (OD-12); EC-03 is not reused (positional wording).
export function ExperienceSystems() {
  return (
    <section
      id="living-worlds"
      aria-labelledby="experience-systems-heading"
      data-section="experience-systems"
      className="scroll-mt-4 border-b"
      style={{ borderColor: 'var(--paper-line)' }}
    >
      <SectionContainer>
        <div className="mx-auto max-w-[var(--editorial-width)] text-center">
          <h2 id="experience-systems-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {S['AVK-FS-FC-01']}
          </h2>
          <p className="mt-4 text-lg leading-8" style={{ color: 'var(--ink-dim)' }}>
            {S['AVK-FS-FC-02']}
          </p>
        </div>

        <RevealOnView className="motion-emerge mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ExperienceCard
            id="echo"
            titleId="ecosystem-echo-title"
            variant="echo"
            title={U['AVK-U03-FX-10']}
            status={{ text: L['AVK-FLW-ST-01'], tier: 'IN DEVELOPMENT' }}
            description={U['AVK-U03-FX-11']}
            supporting={U['AVK-U03-FX-12']}
            media={<EchoMotif />}
          />
          <ExperienceCard
            id="worldk"
            titleId="ecosystem-worldk-title"
            variant="world"
            title={L['AVK-FLW-EC-04']}
            status={{ text: L['AVK-FLW-EC-06'], tier: 'IN DEVELOPMENT' }}
            description={E['AVK-EW-04']}
            supporting={L['AVK-FLW-EC-05']}
            honesty={L['AVK-FLW-EC-07']}
            action={{ label: U['AVK-U03-HN-08'], href: LIVING_WORLDS_HREF }}
            media={<WorldWell />}
          />
        </RevealOnView>

        <div className="mx-auto mt-8 flex max-w-2xl flex-col items-center gap-4 text-center">
          <span
            data-testid="living-forest-inert-pill"
            className="inline-block rounded-full border px-4 py-1.5 text-sm font-semibold"
            style={{ borderColor: 'var(--paper-line)', color: 'var(--ink-dim)' }}
          >
            {L['AVK-FLW-EC-10']}
          </span>
          <p className="text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
            {L['AVK-FLW-EC-09']}
          </p>
        </div>
      </SectionContainer>
    </section>
  )
}
