import { SectionContainer } from '@/components/foundation/Container'
import { RevealOnView } from '@avatark/motion'
import { PROD_SCOPE_I_COPY as P } from '@/lib/content/prodScopeICopy'
import { isInstitutionalScope } from '@/lib/release/scope'
import { ECOSYSTEM_WORLDK_COPY as E } from '@/lib/content/ecosystemWorldkCopy'
import { ECOSYSTEM_04_COPY as G, FOURTH_GROWTH_ENGINE_ID, INTELLIGENCE_SECTION_HEADING, STUDIOK_CAPABILITY_CHIPS, splitRelationTokens, type Ecosystem04CopyId } from '@/lib/content/ecosystem04Copy'
import { DT4H_SETPOINT_COPY as D } from '@/lib/content/dt4hSetpointCopy'
import { getGrowthEngines, getPlatformNode, distinctMaturityLabel, type PlatformNode } from '@/lib/products/platformGraph'
import { PlatformDiagram } from './PlatformDiagram'
import { GrowthEngineCard } from './GrowthEngineCard'
import { PlatformServices } from './PlatformServices'
import { ExpressionLayer } from './ExpressionLayer'
import { ContinueYourJourney } from './ContinueYourJourney'

// Growth Engine editorial copy, kept here rather than in content/foundation/
// *.md -- this is a distinct, curated architecture narrative (AvatarK ->
// Echo -> four Growth Engines -> Expression Layer), not the registry-driven
// Begin/Practice/Play/.../Care grid ecosystem.md already owns (that content
// still feeds the nav dropdown, footer, and homepage teaser unchanged).
// Every fact this narrative can get from the registry -- maturity,
// destination, launch state, recommended next product, GameK's learning
// experiences -- comes from lib/products/platformGraph.ts (RC3) instead of
// being duplicated here; only descriptor/description/ctaLabel/fallback
// feature bullets remain curated prose, since those are this page's own
// editorial framing, not portable platform metadata.
// AVK-ECOSYSTEM-04: `relationId` replaces the registry-derived "Continues to ArenaK" line. Only PrometheusK has
// a documented relationship (arenak-web ARENAK_PROMETHEUS_BOUNDARY.md); GameK and Atlas have none, so no line.
const ENGINE_COPY: Record<string, { descriptor: string; description: string; ctaLabel: string; featuresLabel?: string; fallbackFeatures: string[]; relationId?: Ecosystem04CopyId }> = {
  prometheusk: {
    descriptor: 'Practice Engine',
    description: 'Structured practices that change behavior.',
    ctaLabel: 'Open PrometheusK',
    relationId: 'AVK-E04-PK-REL',
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

// AVK-ECOSYSTEM-04 (owner-approved architecture): StudioK is the fourth Growth Engine card -- Creation & Modeling
// Engine, organizationally under DT4M. Presentation only: the registry is unchanged (StudioK has no journeyRole,
// so it is not on Echo's journey graph, the diagram or Continue Your Journey) and its destination stays plain
// text (productDestinations.ts ALWAYS_PLAIN_TEXT) until separately approved.
const STUDIOK_ENGINE = {
  id: FOURTH_GROWTH_ENGINE_ID,
  descriptor: G['AVK-E04-SK-01'],
  description: G['AVK-E04-SK-02'],
  features: [...STUDIOK_CAPABILITY_CHIPS],
  ctaLabel: 'Open StudioK',
  relationId: 'AVK-E04-SK-03' as Ecosystem04CopyId,
}

function relationParts(id: Ecosystem04CopyId | undefined) {
  if (!id) return undefined
  return splitRelationTokens(G[id]).map((part) => {
    if ('text' in part) return part
    const node: PlatformNode | null = getPlatformNode(part.productId)
    return { name: node?.name ?? part.productId, href: node?.href ?? null }
  })
}

// SetpointK (E04-3: section renamed "Intelligence"): a real registry product, but not on the AvatarK -> Echo
// -> ... -> CinemaK journey chain itself (no journeyRole) -- they build and
// measure the ecosystem above rather than being another step in it. (AVK-ECOSYSTEM-04: StudioK moved out.) Reuses
// getPlatformNode() (works for any registry id, journeyRole or not) and the
// same GrowthEngineCard shape as every other card on this page, just with
// no feature chips (AVK-DT4H-SETPOINT-01: SetpointK now carries one plain-text relation line, "Built on DT4H").
// AVK-DT4H-SETPOINT-01 (PROPOSED): SetpointK is SETPOINT, the execution and adaptation engine built on DT4H (Digital
// Twin for Health). Descriptor, description and relation come from lib/content/dt4hSetpointCopy.ts instead of the
// registry tagline, which credits SetpointK with DT4H's digital-twin modeling. Status/maturity stay registry-derived.
const INTELLIGENCE_COPY: Record<string, { descriptor: string; description: string; relation: string; ctaLabel: string }> = {
  setpointk: { descriptor: D['AVK-DS-SP-01'], description: D['AVK-DS-SP-02'], relation: D['AVK-DS-SP-03'], ctaLabel: 'Open SetpointK' },
}

function getIntelligenceNodes() {
  return Object.keys(INTELLIGENCE_COPY)
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

          {/* AVK-ECOSYSTEM-04: four cards -- 1 column, 2 from sm, 4 from xl (1280px; at lg each card would be ~225px). */}
          <RevealOnView className="motion-emerge-stagger mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {getGrowthEngines().map((engine) => {
              const copy = ENGINE_COPY[engine.id]
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
                  relation={relationParts(copy.relationId)}
                />
              )
            })}
            {(() => {
              const node = getPlatformNode(STUDIOK_ENGINE.id)
              if (!node) return null
              return (
                <GrowthEngineCard
                  key={node.id}
                  engineName={node.name}
                  descriptor={STUDIOK_ENGINE.descriptor}
                  status={node.status}
                  // E04-6: one indicator only -- the VISION badge; the registry's "Preview" (alpha) maturity
                  // label is not shown, so the card cannot read as a publicly available creation platform.
                  maturityLabel={null}
                  description={STUDIOK_ENGINE.description}
                  features={STUDIOK_ENGINE.features}
                  ctaLabel={STUDIOK_ENGINE.ctaLabel}
                  href={node.href}
                  relation={relationParts(STUDIOK_ENGINE.relationId)}
                />
              )
            })()}
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

      {/* Platform Services + Intelligence share one section --
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
            {INTELLIGENCE_SECTION_HEADING}
          </h2>
          {/* AVK-ECOSYSTEM-04: StudioK moved to Growth Engines, so this grid holds one card (SetpointK). */}
          <RevealOnView className="motion-emerge-stagger mx-auto mt-5 grid max-w-sm grid-cols-1 gap-5">
            {getIntelligenceNodes().map((node) => {
              const copy = INTELLIGENCE_COPY[node.id]
              return (
                <GrowthEngineCard
                  key={node.id}
                  engineName={node.name}
                  descriptor={copy.descriptor}
                  status={node.status}
                  maturityLabel={distinctMaturityLabel(node)}
                  description={copy.description}
                  features={[]}
                  relation={[{ text: copy.relation }]}
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
