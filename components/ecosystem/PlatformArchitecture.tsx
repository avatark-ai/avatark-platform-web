import Link from 'next/link'
import { SectionContainer } from '@/components/foundation/Container'
import { RevealOnView } from '@/components/motion/RevealOnView'
import { ENTER_ECHO_HREF } from '@/lib/content/links'
import { resolveEcosystemProduct } from '@/lib/content/ecosystemGroups'
import { PlatformDiagram } from './PlatformDiagram'
import { GrowthEngineCard } from './GrowthEngineCard'
import { ConnectedProducts } from './ConnectedProducts'
import { ExpressionLayer } from './ExpressionLayer'
import { ContinueYourJourney } from './ContinueYourJourney'
import type { PlatformStatus } from './StatusBadge'

// Growth Engine copy, kept here rather than in content/foundation/*.md --
// this is a distinct, curated architecture narrative (AvatarK -> Echo ->
// three Growth Engines -> Expression Layer), not the registry-driven
// Begin/Practice/Play/.../Care grid ecosystem.md already owns (that content
// still feeds the nav dropdown, footer, and homepage teaser unchanged).
// `AtlasK` is this narrative's name for the product the shared registry
// still lists as `Atlas` (id `atlas`) -- resolveEcosystemProduct is used
// only for its href, never its display name, so the two naming schemes
// don't collide.
//
// `status` is this repo's own honest read of how real each destination is
// today (Platform Milestone 1, Part 5) -- not a copy of the shared
// registry's `status` field (which uses a different alpha/beta/live scale
// for a different purpose). PrometheusK and GameK are the two products this
// repo has confirmed live integrations with; AtlasK/ArenaK/StreamK/CinemaK
// scale down from there, matching ecosystem.md's own "not yet integrated"
// notes for Atlas and the product registry's alpha status for the rest.
const GROWTH_ENGINES = [
  {
    id: 'prometheusk',
    engineName: 'PrometheusK',
    descriptor: 'Practice Engine',
    status: 'LIVE' as PlatformStatus,
    description: 'Structured practices that change behavior.',
    features: ['Practice Engine', 'Featured Practice', 'Practice Library', 'Living Echo'],
    ctaLabel: 'Open PrometheusK',
  },
  {
    id: 'gamek',
    engineName: 'GameK',
    descriptor: 'Exploration Engine',
    status: 'LIVE' as PlatformStatus,
    description: 'Interactive worlds for discovering flow, geometry, decision making, creativity and challenge.',
    features: ['FlowK', 'PathK', 'GeometriK', 'ChronicleK', 'Navigator'],
    ctaLabel: 'Enter GameK',
  },
  {
    id: 'atlas',
    engineName: 'AtlasK',
    descriptor: 'Knowledge Engine',
    status: 'PREVIEW' as PlatformStatus,
    description: 'Research, insights, maps, twins, and understanding.',
    features: ['Knowledge Maps', 'Digital Twins', 'Research', 'Projects'],
    ctaLabel: 'Explore Atlas',
  },
] as const

export function PlatformArchitecture() {
  return (
    <>
      {/* Section 1: Entry */}
      <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <SectionContainer className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
            Entry
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">AvatarK → Echo</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
            Everyone begins here.
          </p>

          <div className="mt-10">
            <PlatformDiagram />
          </div>

          <Link
            href={ENTER_ECHO_HREF}
            className="mt-8 inline-block rounded-md px-6 py-3 text-sm font-semibold transition hover:opacity-90 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: 'var(--ink)', color: 'var(--paper)', outlineColor: 'var(--gold)' }}
          >
            Enter Echo
          </Link>
        </SectionContainer>
      </section>

      {/* Section 2: Growth Engines -- choose a path out of Echo. */}
      <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <SectionContainer>
          <p className="text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
            Growth Engines
          </p>

          <RevealOnView className="motion-emerge-stagger mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GROWTH_ENGINES.map((engine) => (
              <GrowthEngineCard
                key={engine.id}
                breadcrumbTrail={['AvatarK', 'Echo', engine.engineName]}
                engineName={engine.engineName}
                descriptor={engine.descriptor}
                status={engine.status}
                description={engine.description}
                features={[...engine.features]}
                ctaLabel={engine.ctaLabel}
                href={resolveEcosystemProduct(engine.id).href}
              />
            ))}
          </RevealOnView>
        </SectionContainer>
      </section>

      {/* Connected Products -- names the platform primitives every Growth
          Engine shares, so the page states outright what the rest of it
          only implies. */}
      <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <SectionContainer>
          <h2 className="text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
            Connected Products
          </h2>
          <div className="mt-8">
            <ConnectedProducts />
          </div>
        </SectionContainer>
      </section>

      {/* Section 3: Expression Layer */}
      <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <SectionContainer>
          <p className="text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
            Expression Layer
          </p>
          <div className="mt-8">
            <ExpressionLayer />
          </div>
        </SectionContainer>
      </section>

      {/* Continue Your Journey -- a user journey, not a roadmap: what to do
          next once you've already practiced, competed, or inspired someone. */}
      <section>
        <SectionContainer>
          <h2 className="text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
            Continue Your Journey
          </h2>
          <div className="mt-8">
            <ContinueYourJourney />
          </div>
        </SectionContainer>
      </section>
    </>
  )
}
