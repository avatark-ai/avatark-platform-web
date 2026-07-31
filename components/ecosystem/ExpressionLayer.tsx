import Link from 'next/link'
import { DepartureLink, RevealOnView } from '@avatark/motion'
import { getConvergenceLayer, getExpressionLayer as getExpressionNodes, getJourneyTransitions, distinctMaturityLabel, type PlatformNode } from '@/lib/products/platformGraph'
import { StatusBadge } from './StatusBadge'

// ArenaK (convergence) -> StreamK -> CinemaK (expression): the layer where
// private growth becomes shared expression. Maturity/destination/launch-
// state/recommended-next all resolve from lib/products/platformGraph.ts
// (RC3) -- only descriptor/bullets stay curated prose here, this page's own
// editorial framing rather than portable platform metadata.
//
// RC4: "Field Atlas" (ArenaK's future community-mapping capability) is
// listed as one of ArenaK's own bullets, not as a separate ecosystem
// product -- Atlas (the DT4I knowledge platform, a Growth Engine) keeps its
// name; nothing here collides with it.
const LAYER_COPY: Record<string, { descriptor: string; bullets: string[] }> = {
  arenak: { descriptor: 'Community Platform', bullets: ['Community', 'Competition', 'Challenges', 'Recognition', 'Field Atlas'] },
  streamk: { descriptor: 'Media Platform', bullets: ['Stories', 'Events', 'Live experiences'] },
  cinemak: { descriptor: 'Story Platform', bullets: ['Documentaries', 'Series', 'Films'] },
}

function getLayers(): PlatformNode[] {
  return [...getConvergenceLayer(), ...getExpressionNodes()]
}

function LayerCard({ node }: { node: PlatformNode }) {
  const copy = LAYER_COPY[node.id]
  const external = node.href?.startsWith('http') ?? false
  const maturityLabel = distinctMaturityLabel(node)
  const nextProducts = getJourneyTransitions()
    .find((t) => t.sources.some((s) => s.id === node.id))
    ?.targets.map((target) => ({ name: target.name, href: target.href }))

  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-lg border p-6 text-center"
      style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
    >
      <div className="flex items-center justify-center gap-3">
        {/* --ink-dim, not --gold: this descriptor line is new (LayerCard had
            no eyebrow before Platform Milestone 1) and gold text against this
            card's --surface-card background measures ~1.98:1, under WCAG
            AA's 4.5:1 -- --ink-dim clears ~7.3:1 here. */}
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
          {copy.descriptor}
        </p>
        <StatusBadge status={node.status} />
      </div>
      <h3 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>
        {node.name}
      </h3>
      {maturityLabel && (
        <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-dim)' }}>
          {maturityLabel}
        </p>
      )}
      {node.purpose && (
        <p className="text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {node.purpose}
        </p>
      )}
      <ul className="flex flex-wrap justify-center gap-2">
        {copy.bullets.map((bullet) => (
          <li
            key={bullet}
            className="rounded-full border px-2.5 py-1 text-xs font-medium"
            style={{ borderColor: 'var(--paper-line)', color: 'var(--ink-dim)' }}
          >
            {bullet}
          </li>
        ))}
      </ul>
      {node.href &&
        (external ? (
          <DepartureLink
            href={node.href}
            className="link-underline-draw rounded-sm text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
          >
            Open {node.name} →
          </DepartureLink>
        ) : (
          <Link
            href={node.href}
            className="link-underline-draw rounded-sm text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
          >
            Open {node.name} →
          </Link>
        ))}
      {nextProducts && nextProducts.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>
          Continues to{' '}
          {nextProducts.map((next, index) => {
            const nextExternal = next.href?.startsWith('http') ?? false
            return (
              <span key={next.name}>
                {index > 0 && ', '}
                {next.href ? (
                  nextExternal ? (
                    <DepartureLink href={next.href} className="link-underline-draw font-semibold" style={{ color: 'var(--ink)' }}>
                      {next.name}
                    </DepartureLink>
                  ) : (
                    <Link href={next.href} className="link-underline-draw font-semibold" style={{ color: 'var(--ink)' }}>
                      {next.name}
                    </Link>
                  )
                ) : (
                  <span className="font-semibold">{next.name}</span>
                )}
              </span>
            )
          })}
        </p>
      )}
    </div>
  )
}

export function ExpressionLayer() {
  const layers = getLayers()
  return (
    <RevealOnView className="motion-emerge-stagger flex flex-col items-center gap-4">
      {layers.map((node, index) => (
        <div key={node.id} className="flex w-full flex-col items-center gap-4">
          {index > 0 && (
            <span aria-hidden="true" className="text-xl" style={{ color: 'var(--gold)' }}>
              ↓
            </span>
          )}
          <LayerCard node={node} />
        </div>
      ))}
    </RevealOnView>
  )
}
