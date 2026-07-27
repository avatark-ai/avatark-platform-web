import Link from 'next/link'
import { SectionContainer } from '@/components/foundation/Container'
import { RevealOnView } from '@/components/motion/RevealOnView'
import { ENTER_ECHO_HREF } from '@/lib/content/links'
import { getGrowthEngines, getJourneyTransitions } from '@/lib/products/platformGraph'
import { PlatformDiagram } from './PlatformDiagram'
import { GrowthEngineCard } from './GrowthEngineCard'
import { ConnectedProducts } from './ConnectedProducts'
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
            {getGrowthEngines().map((engine) => {
              const copy = ENGINE_COPY[engine.id]
              const nextProducts = getJourneyTransitions()
                .find((t) => t.sources.some((s) => s.id === engine.id))
                ?.targets.map((target) => ({ name: target.name, href: target.href }))
              return (
                <GrowthEngineCard
                  key={engine.id}
                  breadcrumbTrail={['AvatarK', 'Echo', engine.name]}
                  engineName={engine.name}
                  descriptor={copy.descriptor}
                  status={engine.status}
                  description={copy.description}
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

      {/* Connected Products -- names the platform primitives every Growth
          Engine shares, so the page states outright what the rest of it
          only implies. */}
      <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <SectionContainer>
          {/* --ink-dim, not --gold: this heading is new (Platform Milestone
              1) and gold text against this section's --paper background
              measures ~1.86:1, under WCAG AA's 4.5:1 -- --ink-dim clears
              ~6.85:1 here. */}
          <h2 className="text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
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
          {/* --ink-dim, not --gold: this heading is new (Platform Milestone
              1) and gold text against this section's --paper background
              measures ~1.86:1, under WCAG AA's 4.5:1 -- --ink-dim clears
              ~6.85:1 here. */}
          <h2 className="text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
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
