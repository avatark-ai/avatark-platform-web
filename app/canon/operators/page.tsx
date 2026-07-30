import type { Metadata } from 'next'
import { CanonPageLayout } from '@/components/foundation/canon/CanonPageLayout'
import { CanonFormula } from '@/components/foundation/canon/CanonFormula'
import { RevealOnView } from '@/components/motion/RevealOnView'
import { OPERATORS_CONTENT } from '@/lib/content/canonReaders'

export const metadata: Metadata = {
  title: 'Operators — The Canon',
  description: 'Ground, Dynamics, Structure and Emergence — the irreducible operators of the AvatarK Canon.',
}

export default function OperatorsPage() {
  const { title, intro, operators, canonicalConstraint } = OPERATORS_CONTENT

  return (
    <CanonPageLayout>
      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
          Canon / Operators
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

      <RevealOnView className="motion-emerge-stagger grid grid-cols-1 gap-5 sm:grid-cols-2">
        {operators.map((operator) => (
          <div
            key={operator.id}
            className="rounded-lg border p-5"
            style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
          >
            <p className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
              {operator.title}
              <span className="ml-2 text-sm font-normal" style={{ color: 'var(--ink-dim)' }}>
                {operator.subtitle}
              </span>
            </p>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
              {operator.body}
            </p>
            <p className="mt-3 text-sm leading-6" style={{ color: 'var(--gold)' }}>
              {operator.constraintNote}
            </p>
          </div>
        ))}
      </RevealOnView>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          {canonicalConstraint.heading}
        </p>
        <CanonFormula>{canonicalConstraint.formula}</CanonFormula>
        <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {canonicalConstraint.note}
        </p>
      </div>
    </CanonPageLayout>
  )
}
