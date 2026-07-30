import Link from 'next/link'
import { DepartureLink } from '@/components/motion/DepartureLink'
import { StatusBadge, type PlatformStatus } from './StatusBadge'

// One of the three equal Growth Engine cards (PrometheusK, GameK, AtlasK).
// `href` and `nextProducts` are always resolved by the caller from
// lib/products/platformGraph.ts (itself reading @avatark/product-registry)
// so this card never fabricates a destination or a relationship -- same
// resolver the pre-existing /ecosystem grid and the homepage's
// EcosystemPreview already share, so this card can't drift from the real
// product registry either.
//
// RC4 final polish: no longer opens with an "AvatarK > Echo > Product"
// breadcrumb -- the page already establishes that lineage (the diagram,
// the section headings), so repeating it inside every card was redundant.
// Cards now open directly with their descriptor (e.g. "Practice Engine").
export function GrowthEngineCard({
  engineName,
  descriptor,
  status,
  maturityLabel,
  description,
  features,
  featuresLabel,
  href,
  ctaLabel,
  nextProducts,
}: {
  engineName: string
  descriptor: string
  status: PlatformStatus
  // RC4: a subtle, secondary maturity read (e.g. "Beta") shown only when
  // it says something the `status` badge doesn't already say -- the
  // caller decides via lib/products/platformGraph.ts's
  // distinctMaturityLabel, so this card doesn't repeat itself.
  maturityLabel?: string | null
  description: string
  features: string[]
  // Optional eyebrow above the feature chips (e.g. GameK's "Learning
  // Experiences" for FlowK/PathK/GeometriK/ChronicleK). Omitted elsewhere,
  // matching every other Growth Engine card's existing unlabeled chip row.
  featuresLabel?: string
  href: string | null
  ctaLabel: string
  // Recommended next product(s) this engine's journey typically continues
  // into (e.g. PrometheusK -> ArenaK). Empty when this engine has no
  // confirmed next step yet.
  nextProducts?: { name: string; href: string | null }[]
}) {
  const external = href?.startsWith('http') ?? false

  return (
    <div
      className="flex flex-col rounded-lg border p-6"
      style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          {descriptor}
        </p>
        <StatusBadge status={status} />
      </div>
      <h3 className="mt-2 text-xl font-semibold" style={{ color: 'var(--ink)' }}>
        {engineName}
      </h3>
      {maturityLabel && (
        <p className="mt-0.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--ink-dim)' }}>
          {maturityLabel}
        </p>
      )}
      <p className="mt-3 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
        {description}
      </p>

      {features.length > 0 && (
        <div className="mt-4">
          {featuresLabel && (
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
              {featuresLabel}
            </p>
          )}
          <ul className="mt-2 flex flex-wrap gap-2">
            {features.map((feature) => (
              <li
                key={feature}
                className="rounded-full border px-2.5 py-1 text-xs font-medium"
                style={{ borderColor: 'var(--paper-line)', color: 'var(--ink-dim)' }}
              >
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      {nextProducts && nextProducts.length > 0 && (
        <p className="mt-4 text-xs" style={{ color: 'var(--ink-dim)' }}>
          Continues to{' '}
          {nextProducts.map((product, index) => {
            const nextExternal = product.href?.startsWith('http') ?? false
            return (
              <span key={product.name}>
                {index > 0 && ', '}
                {product.href ? (
                  nextExternal ? (
                    <DepartureLink href={product.href} className="link-underline-draw font-semibold" style={{ color: 'var(--ink)' }}>
                      {product.name}
                    </DepartureLink>
                  ) : (
                    <Link href={product.href} className="link-underline-draw font-semibold" style={{ color: 'var(--ink)' }}>
                      {product.name}
                    </Link>
                  )
                ) : (
                  <span className="font-semibold">{product.name}</span>
                )}
              </span>
            )
          })}
        </p>
      )}

      <div className="mt-6">
        {href ? (
          external ? (
            <DepartureLink
              href={href}
              className="link-underline-draw rounded-sm text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
            >
              {ctaLabel} →
            </DepartureLink>
          ) : (
            <Link
              href={href}
              className="link-underline-draw rounded-sm text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
            >
              {ctaLabel} →
            </Link>
          )
        ) : (
          <span className="text-sm font-semibold" style={{ color: 'var(--ink-dim)' }}>
            {ctaLabel} (in development)
          </span>
        )}
      </div>
    </div>
  )
}
