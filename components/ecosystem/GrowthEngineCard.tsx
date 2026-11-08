import Link from 'next/link'
import { DepartureLink } from '@avatark/motion'
import { StatusBadge, type PlatformStatus } from './StatusBadge'
import { isInstitutionalScope } from '@/lib/release/scope'

// One of the four equal Growth Engine cards (PrometheusK, GameK, Atlas, StudioK -- AVK-ECOSYSTEM-04).
// `href` and `relation` product hrefs are always resolved by the caller from
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
  relation,
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
  // AVK-ECOSYSTEM-04: product-specific relationship line, as text and
  // product segments (href already resolved through the Scope I policy).
  relation?: ({ text: string } | { name: string; href: string | null })[]
}) {
  const external = href?.startsWith('http') ?? false

  return (
    <div
      className="flex flex-col rounded-lg border p-6"
      style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold-ink)' }}>
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

      {/* AVK-ECOSYSTEM-04: a product-specific relationship line (register lib/content/ecosystem04Copy.ts, PROPOSED) in place
          of the generic "Continues to <next product>" line, which no architectural contract supported for
          GameK or Atlas. Omitted when an engine has no documented relationship. Product segments keep the
          Scope I destination policy: linked only when their resolved href is non-null. */}
      {relation && relation.length > 0 && (
        <p data-testid="engine-relation" className="mt-4 text-xs" style={{ color: 'var(--ink-dim)' }}>
          {relation.map((part, index) => {
            if ('text' in part) return <span key={index}>{part.text}</span>
            const partExternal = part.href?.startsWith('http') ?? false
            return part.href ? (
              partExternal ? (
                <DepartureLink key={index} href={part.href} className="link-underline-draw font-semibold" style={{ color: 'var(--ink)' }}>
                  {part.name}
                </DepartureLink>
              ) : (
                <Link key={index} href={part.href} className="link-underline-draw font-semibold" style={{ color: 'var(--ink)' }}>
                  {part.name}
                </Link>
              )
            ) : (
              <span key={index} className="font-semibold">
                {part.name}
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
              style={{ color: 'var(--ink)', outlineColor: 'var(--focus-ring)' }}
            >
              {ctaLabel} →
            </DepartureLink>
          ) : (
            <Link
              href={href}
              className="link-underline-draw rounded-sm text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: 'var(--ink)', outlineColor: 'var(--focus-ring)' }}
            >
              {ctaLabel} →
            </Link>
          )
        ) : isInstitutionalScope() ? (
          // AVK-PROD-03B X-1: in Scope I a withheld destination is not "in development" -- adding
          // that wording would be an unapproved status claim -- so the card shows no action at all
          // (same treatment as ExpressionLayer's LayerCard). The product stays as plain text above.
          null
        ) : (
          <span className="text-sm font-semibold" style={{ color: 'var(--ink-dim)' }}>
            {ctaLabel} (in development)
          </span>
        )}
      </div>
    </div>
  )
}
