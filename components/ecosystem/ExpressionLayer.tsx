import Link from 'next/link'
import { DepartureLink } from '@/components/motion/DepartureLink'
import { RevealOnView } from '@/components/motion/RevealOnView'
import { resolveEcosystemProduct } from '@/lib/content/ecosystemGroups'

// ArenaK -> StreamK -> CinemaK: the layer where private growth becomes
// shared expression. Fixed, hand-authored structure (not data-driven from
// outside) since it's exactly three products in exactly one order, same as
// FragmentedVsLongitudinal hardcoding its own six labels rather than taking
// them as a prop.
const LAYERS = [
  { id: 'arenak', bullets: ['Community', 'Competition', 'Challenges', 'Recognition'] },
  { id: 'streamk', bullets: ['Stories', 'Events', 'Live experiences'] },
  { id: 'cinemak', bullets: ['Documentaries', 'Series', 'Films'] },
] as const

function LayerCard({ id, bullets }: { id: string; bullets: readonly string[] }) {
  const product = resolveEcosystemProduct(id)
  const external = product.href?.startsWith('http') ?? false

  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-lg border p-6 text-center"
      style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
    >
      <h3 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>
        {product.name}
      </h3>
      {product.purpose && (
        <p className="text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {product.purpose}
        </p>
      )}
      <ul className="flex flex-wrap justify-center gap-2">
        {bullets.map((bullet) => (
          <li
            key={bullet}
            className="rounded-full border px-2.5 py-1 text-xs font-medium"
            style={{ borderColor: 'var(--paper-line)', color: 'var(--ink-dim)' }}
          >
            {bullet}
          </li>
        ))}
      </ul>
      {product.href &&
        (external ? (
          <DepartureLink
            href={product.href}
            className="link-underline-draw rounded-sm text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
          >
            Open {product.name} →
          </DepartureLink>
        ) : (
          <Link
            href={product.href}
            className="link-underline-draw rounded-sm text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
          >
            Open {product.name} →
          </Link>
        ))}
    </div>
  )
}

export function ExpressionLayer() {
  return (
    <RevealOnView className="motion-emerge-stagger flex flex-col items-center gap-4">
      {LAYERS.map((layer, index) => (
        <div key={layer.id} className="flex w-full flex-col items-center gap-4">
          {index > 0 && (
            <span aria-hidden="true" className="text-xl" style={{ color: 'var(--gold)' }}>
              ↓
            </span>
          )}
          <LayerCard id={layer.id} bullets={layer.bullets} />
        </div>
      ))}
    </RevealOnView>
  )
}
