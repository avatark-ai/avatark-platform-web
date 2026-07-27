import Link from 'next/link'
import { SectionContainer } from '@/components/foundation/Container'
import { RevealOnView } from '@/components/motion/RevealOnView'
import { ENTER_ECHO_HREF } from '@/lib/content/links'
import { resolveEcosystemProduct } from '@/lib/content/ecosystemGroups'
import { PlatformDiagram } from './PlatformDiagram'
import { GrowthEngineCard } from './GrowthEngineCard'
import { ExpressionLayer } from './ExpressionLayer'

// Growth Engine copy, kept here rather than in content/foundation/*.md --
// this is a distinct, curated architecture narrative (AvatarK -> Echo ->
// three Growth Engines -> Expression Layer), not the registry-driven
// Begin/Practice/Play/.../Care grid ecosystem.md already owns (that content
// still feeds the nav dropdown, footer, and homepage teaser unchanged).
// `AtlasK` is this narrative's name for the product the shared registry
// still lists as `Atlas` (id `atlas`) -- resolveEcosystemProduct is used
// only for its href, never its display name, so the two naming schemes
// don't collide.
const GROWTH_ENGINES = [
  {
    id: 'prometheusk',
    engineName: 'PrometheusK',
    title: 'Practice',
    description: 'Structured practices that change behavior.',
  },
  {
    id: 'gamek',
    engineName: 'GameK',
    title: 'Exploration',
    description: 'Interactive worlds for discovering flow, geometry, decision making, creativity and challenge.',
    subItems: ['FlowK', 'PathK', 'GeometriK', 'ChronicleK', 'Navigator'],
  },
  {
    id: 'atlas',
    engineName: 'AtlasK',
    title: 'Knowledge',
    description: 'Research, insights, maps, twins, and understanding.',
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

      {/* Section 2: Growth Engines */}
      <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <SectionContainer>
          <p className="text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
            Growth Engines
          </p>

          <RevealOnView className="motion-emerge-stagger mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {GROWTH_ENGINES.map((engine) => (
              <GrowthEngineCard
                key={engine.id}
                engineName={engine.engineName}
                title={engine.title}
                description={engine.description}
                subItems={'subItems' in engine ? [...engine.subItems] : undefined}
                href={resolveEcosystemProduct(engine.id).href}
              />
            ))}
          </RevealOnView>
        </SectionContainer>
      </section>

      {/* Section 3: Expression Layer */}
      <section>
        <SectionContainer>
          <p className="text-center text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
            Expression Layer
          </p>
          <div className="mt-8">
            <ExpressionLayer />
          </div>
        </SectionContainer>
      </section>
    </>
  )
}
