import type { Metadata } from 'next'
import { CanonPageLayout } from '@/components/foundation/canon/CanonPageLayout'
import { CanonFormula } from '@/components/foundation/canon/CanonFormula'
import { CanonPairGrid } from '@/components/foundation/canon/CanonPairGrid'
import { DYNAMICS_CONTENT } from '@/lib/content/canonReaders'

export const metadata: Metadata = {
  title: 'Dynamics — The Canon',
  description: 'How the Canon moves — dominance distributions, canonical regimes, and transition patterns.',
}

export default function DynamicsPage() {
  const { title, intro, dominanceDistributions, canonicalConstraint, stabilityAxes, regimes, transitions, imbalance, closing } =
    DYNAMICS_CONTENT

  return (
    <CanonPageLayout>
      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
          Canon / Dynamics
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          Framework
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h1>
        {intro.map((paragraph) => (
          <p key={paragraph} className="mt-5 max-w-2xl text-lg leading-8" style={{ color: 'var(--ink-dim)' }}>
            {paragraph}
          </p>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          {dominanceDistributions.heading}
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {dominanceDistributions.lead}
        </p>
        <CanonFormula>{dominanceDistributions.formula}</CanonFormula>
        <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {dominanceDistributions.note}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          {canonicalConstraint.heading}
        </p>
        <CanonFormula>{canonicalConstraint.formula}</CanonFormula>
        <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {canonicalConstraint.note}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          {stabilityAxes.heading}
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {stabilityAxes.lead}
        </p>
        <CanonPairGrid items={stabilityAxes.pairs} />
        <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {stabilityAxes.closing}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          {regimes.heading}
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {regimes.lead}
        </p>
        <CanonPairGrid items={regimes.items} />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          {transitions.heading}
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {transitions.lead}
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium" style={{ color: 'var(--ink)' }}>
          {transitions.innovationCycle.map((step, index) => (
            <span key={step} className="inline-flex items-center gap-2">
              {index > 0 && <span aria-hidden="true" style={{ color: 'var(--gold)' }}>→</span>}
              {step}
            </span>
          ))}
        </p>
        <p className="mt-5 max-w-2xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {transitions.stabilizationLead}
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium" style={{ color: 'var(--ink)' }}>
          {transitions.stabilizationCycle.map((step, index) => (
            <span key={step} className="inline-flex items-center gap-2">
              {index > 0 && <span aria-hidden="true" style={{ color: 'var(--gold)' }}>→</span>}
              {step}
            </span>
          ))}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          {imbalance.heading}
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {imbalance.lead}
        </p>
        <CanonPairGrid items={imbalance.items} />
        <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {imbalance.closing}
        </p>
      </div>

      <div className="border-t pt-8" style={{ borderColor: 'var(--paper-line)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          {closing.heading}
        </p>
        <p className="mt-2 max-w-2xl text-base leading-7" style={{ color: 'var(--ink)' }}>
          {closing.body}
        </p>
      </div>
    </CanonPageLayout>
  )
}
