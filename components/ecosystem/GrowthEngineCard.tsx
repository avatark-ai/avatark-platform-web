import Link from 'next/link'
import { DepartureLink } from '@/components/motion/DepartureLink'
import { PlatformBreadcrumb } from './PlatformBreadcrumb'
import { StatusBadge, type PlatformStatus } from './StatusBadge'

// One of the three equal Growth Engine cards (PrometheusK, GameK, AtlasK).
// `href` is always resolved by the caller via resolveEcosystemProduct so
// this card never fabricates a destination -- same resolver the
// pre-existing /ecosystem grid and the homepage's EcosystemPreview already
// share, so this card can't drift from the real product registry either.
export function GrowthEngineCard({
  breadcrumbTrail,
  engineName,
  descriptor,
  status,
  description,
  features,
  href,
  ctaLabel,
}: {
  breadcrumbTrail: string[]
  engineName: string
  descriptor: string
  status: PlatformStatus
  description: string
  features: string[]
  href: string | null
  ctaLabel: string
}) {
  const external = href?.startsWith('http') ?? false

  return (
    <div
      className="flex flex-col rounded-lg border p-6"
      style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
    >
      <PlatformBreadcrumb trail={breadcrumbTrail} />

      <div className="mt-4 flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          {descriptor}
        </p>
        <StatusBadge status={status} />
      </div>
      <h3 className="mt-2 text-xl font-semibold" style={{ color: 'var(--ink)' }}>
        {engineName}
      </h3>
      <p className="mt-3 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
        {description}
      </p>

      {features.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
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
            {ctaLabel} (coming soon)
          </span>
        )}
      </div>
    </div>
  )
}
