import { SectionContainer } from '@/components/foundation/Container'
import { RevealOnView } from '@avatark/motion'
import { PROD_SCOPE_I_COPY as P } from '@/lib/content/prodScopeICopy'
import { isInstitutionalScope } from '@/lib/release/scope'
import { ECOSYSTEM_WORLDK_COPY as E } from '@/lib/content/ecosystemWorldkCopy'
import { getGrowthEngines, getJourneyTransitions, getPlatformNode, distinctMaturityLabel } from '@/lib/products/platformGraph'
import { PlatformDiagram } from './PlatformDiagram'
import { GrowthEngineCard } from './GrowthEngineCard'
import { PlatformServices } from './PlatformServices'
import { ExpressionLayer } from './ExpressionLayer'
import { ContinueYourJourney } from './ContinueYourJourney'

// Growth Engine editorial copy, kept here rather than in content/foundation/
// *.md -- this is a distinct, curated architecture narrative (AvatarK ->
// Echo -> three Growth Engines -> Expression Layer), not the registry-driven
// Begin/Practice/Play/.../Care grid ecosystem.md already owns (that content
// still feeds the nav dropdown, footer, and homepage teaser unchanged).
// Every fact this narrative can get from the registry -- maturity,
// destination, launch state, recommended next product, GameK's learning
// experiences -- comes from lib/products/platformGraph.ts (RC3) instead of
// being duplicated here; only descriptor/description/ctaLabel/fallback
// feature bullets remain curated prose, since those are this page's own
// editorial framing, not portable platform metadata.
const ENGINE_COPY: Record<string, { descriptor: string; description: string; ctaLabel: string; featuresLabel?: string; fallbackFeatures: string[] }> = {
  prometheusk: {
    descriptor: 'Practice Engine',
    description: 'Structured practices that change behavior.',
    ctaLabel: 'Open PrometheusK',
    fallbackFeatures: ['Practice Engine', 'Featured Practice', 'Practice Library', 'Living Echo'],
  },
  gamek: {
    descriptor: 'Exploration Engine',
    description: 'Interactive worlds for discovering flow, geometry, decision making, creativity and challenge.',
    ctaLabel: 'Enter GameK',
    featuresLabel: 'Learning Experiences',
    fallbackFeatures: ['FlowK', 'PathK', 'GeometriK', 'ChronicleK'],
  },
  atlas: {
    descriptor: 'Knowledge Engine',
    description: 'Research, insights, maps, twins, and understanding.',
    ctaLabel: 'Explore Atlas',
    fallbackFeatures: ['Knowledge Maps', 'Digital Twins', 'Research', 'Projects'],
  },
}

// StudioK/SetpointK: real registry products, but not on the AvatarK -> Echo
// -> ... -> CinemaK journey chain itself (no journeyRole) -- they build and
// measure the ecosystem above rather than being another step in it. Reuses
// getPlatformNode() (works for any registry id, journeyRole or not) and the
// same GrowthEngineCard shape as every other card on this page, just with
// no feature chips and no "Continues to" line, since neither applies here.
const CREATOR_INTELLIGENCE_COPY: Record<string, { descriptor: string; ctaLabel: string }> = {
  studiok: { descriptor: 'Creation Engine', ctaLabel: 'Open StudioK' },
  setpointk: { descriptor: 'Intelligence Layer', ctaLabel: 'Open SetpointK' },
}

function getCreatorIntelligenceNodes() {
  return Object.keys(CREATOR_INTELLIGENCE_COPY)
    .map((id) => getPlatformNode(id))
    .filter((node) => node !== null)
}

export function PlatformArchitecture() {
  return (
    <>
      {/* AVK-ECOSYSTEM-WORLDK-02 (OD-EW-7): the journey diagram, geometry unchanged, now framed as one
          possible path of growth (EW-06 heading, EW-07 visible caption, EW-08 accessible name) rather than
          the page's architecture -- the architecture is "How the parts relate", above. */}
      <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <SectionContainer className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold-ink)' }}>
            Architecture
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{E['AVK-EW-06']}</h2>
          <p data-testid="journey-caption" className="mx-auto mt-3 max-w-xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
            {E['AVK-EW-07']}
          </p>

          <div className="mt-5">
            <PlatformDiagram />
          </div>

          {/* AVK-PROD-03A CD-1B: static development status in place of the executable Echo entry
              (Scope I excludes the Echo application). Not a link. */}
          <p className="mt-5 text-sm font-semibold" style={{ color: 'var(--ink-dim)' }}>
            {P['AVK-PROD-CD1B-01']}
          </p>
        </SectionContainer>
      </section>

      {/* Growth Engines -- choose a path out of Echo. */}
      <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <SectionContainer>
          {/* AVK-ECOSYSTEM-WORLDK-02: h2 (was <p>) so the engine cards are not outlined under the journey heading. */}
          <h2 className="text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold-ink)' }}>
            Growth Engines
          </h2>

          <RevealOnView className="motion-emerge-stagger mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {getGrowthEngines().map((engine) => {
              const copy = ENGINE_COPY[engine.id]
              const nextProducts = getJourneyTransitions()
                .find((t) => t.sources.some((s) => s.id === engine.id))
                ?.targets.map((target) => ({ name: target.name, href: target.href }))
              return (
                <GrowthEngineCard
                  key={engine.id}
                  engineName={engine.name}
                  descriptor={copy.descriptor}
                  status={engine.status}
                  maturityLabel={distinctMaturityLabel(engine)}
                  description={engine.id === 'gamek' && isInstitutionalScope() ? P['AVK-PROD-GK-01'] : copy.description}
                  features={engine.experiences.length > 0 ? engine.experiences.map((e) => e.name) : copy.fallbackFeatures}
                  featuresLabel={copy.featuresLabel}
                  ctaLabel={copy.ctaLabel}
                  href={engine.href}
                  nextProducts={nextProducts}
                />
              )
            })}
          </RevealOnView>
        </SectionContainer>
      </section>

      {/* Expression Layer */}
      <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <SectionContainer>
          {/* AVK-ECOSYSTEM-WORLDK-02: h2 (was <p>), same reason. */}
          <h2 className="text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold-ink)' }}>
            Expression Layer
          </h2>
          <div className="mt-5">
            <ExpressionLayer />
          </div>
        </SectionContainer>
      </section>

      {/* Platform Services + Creator & Intelligence share one section --
          both explain what sits *underneath* or *alongside* the journey
          chain above, rather than being another step in it. */}
      <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <SectionContainer>
          {/* --ink-dim, not --gold: gold text against this section's
              --paper background measures ~1.86:1, under WCAG AA's 4.5:1 --
              --ink-dim clears ~6.85:1 here. */}
          <h2 className="text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
            Platform Services
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
            Every product above is one surface of a single platform, not a separate product that happens to sit
            next to the others. These are the services it shares.
          </p>
          <div className="mt-5">
            <PlatformServices />
          </div>

          <h2 className="mt-8 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
            Creator & Intelligence
          </h2>
          <RevealOnView className="motion-emerge-stagger mx-auto mt-5 grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">
            {getCreatorIntelligenceNodes().map((node) => {
              const copy = CREATOR_INTELLIGENCE_COPY[node.id]
              return (
                <GrowthEngineCard
                  key={node.id}
                  engineName={node.name}
                  descriptor={copy.descriptor}
                  status={node.status}
                  maturityLabel={distinctMaturityLabel(node)}
                  description={node.purpose ?? ''}
                  features={[]}
                  ctaLabel={copy.ctaLabel}
                  href={node.href}
                />
              )
            })}
          </RevealOnView>
        </SectionContainer>
      </section>

      {/* Continue Your Journey -- a user journey, not a roadmap: what to do
          next once you've already practiced, competed, or inspired someone. */}
      <section>
        <SectionContainer>
          <h2 className="text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
            Continue Your Journey
          </h2>
          <div className="mt-5">
            <ContinueYourJourney />
          </div>
        </SectionContainer>
      </section>
    </>
  )
}
