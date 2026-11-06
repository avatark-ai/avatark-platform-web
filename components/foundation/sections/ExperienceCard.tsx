import Link from 'next/link'
import { StatusPill } from '@/components/foundation/StatusPill'
import type { PlatformStatus } from '@/components/ecosystem/StatusBadge'

// AVK-UNIFICATION-03B (FEATURED-EXPERIENCES-SPEC §2): one shared layout and interaction contract for
// the homepage experiences, with distinct visual identities per variant. The card itself is not a
// link: the single action is the only tab stop. U-03C 'concept' variant (future worlds): no action, no
// hover affordance, not focusable (WORLD-GALLERY-CONTRACT §3).
type Variant = 'echo' | 'world' | 'concept'

const SURFACE: Record<Variant, { background: string; color: string; dim: string; border: string; hover: string }> = {
  // Echo: intimate, reflective, geometric. AVK-VISUAL-01B (OD-V1, A1): the midnight identity lives in
  // Echo's media panel (FeaturedExperiences EchoMotif); the body shares the light card surface so both
  // experiences align. The gold hover border stays Echo's.
  echo: { background: 'var(--surface-card)', color: 'var(--ink)', dim: 'var(--ink-dim)', border: 'var(--paper-line)', hover: 'hover:border-[var(--gold)]' },
  // Living Worlds: expansive, environmental -- the surface the Living Worlds band used.
  world: { background: 'var(--surface-card)', color: 'var(--ink)', dim: 'var(--ink-dim)', border: 'var(--paper-line)', hover: 'hover:border-[var(--ink)]' },
  // Future concept: muted, and deliberately no hover change (nothing to click).
  concept: { background: 'var(--surface-card)', color: 'var(--ink)', dim: 'var(--ink-dim)', border: 'var(--paper-line)', hover: '' },
}

const ACTION: Record<Exclude<Variant, 'concept'>, React.CSSProperties> = {
  // AVK-VISUAL-01B: the gold CTA is unchanged; its focus ring follows the light card (--focus-ring).
  echo: { background: 'var(--gold)', color: 'var(--midnight)', outlineColor: 'var(--focus-ring)' },
  world: { background: 'var(--ink)', color: 'var(--paper)', outlineColor: 'var(--focus-ring)' },
}

export function ExperienceCard({
  id,
  titleId,
  variant,
  title,
  description,
  supporting,
  status,
  honesty,
  action,
  media,
}: {
  id?: string
  titleId?: string
  variant: Variant
  title: string
  description?: string
  supporting?: string
  status?: { text: string; tier: PlatformStatus }
  honesty?: string
  action?: { label: string; href: string } | null
  media: React.ReactNode
}) {
  const s = SURFACE[variant]
  const headingId = titleId ?? `experience-${variant}-title`
  return (
    <article
      id={id}
      aria-labelledby={headingId}
      data-experience={variant}
      className={`flex h-full scroll-mt-4 flex-col overflow-hidden rounded-2xl border ${variant === 'concept' ? '' : 'transition-colors duration-200 lg:min-h-[22rem]'} ${s.hover}`}
      style={{ background: s.background, color: s.color, borderColor: s.border }}
    >
      {media}
      <div className="flex flex-1 flex-col gap-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <h3 id={headingId} className="text-2xl font-semibold tracking-tight">
            {title}
          </h3>
          {status && <StatusPill text={status.text} tier={status.tier} />}
        </div>
        {description && <p className="text-lg leading-8">{description}</p>}
        {supporting && (
          <p className="text-base leading-7" style={{ color: s.dim }}>
            {supporting}
          </p>
        )}
        {honesty && (
          <p className="text-sm leading-6" style={{ color: s.dim }}>
            {honesty}
          </p>
        )}
        {action && variant !== 'concept' && (
          <div className="mt-auto pt-2">
            <Link
              href={action.href}
              className="inline-block w-full rounded-md px-6 py-3 text-center text-sm font-semibold transition hover:opacity-90 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto"
              style={ACTION[variant]}
            >
              {action.label}
            </Link>
          </div>
        )}
      </div>
    </article>
  )
}
