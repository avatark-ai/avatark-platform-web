import type { Metadata } from 'next'
import { CanonPageLayout } from '@/components/foundation/canon/CanonPageLayout'
import { CanonPairGrid } from '@/components/foundation/canon/CanonPairGrid'
import { OpenInFullCanon } from '@/components/foundation/canon/OpenInFullCanon'
import { ALIGNMENT_CONTENT } from '@/lib/content/canonReaders'
import { findCanonNavItem } from '@/lib/content/canonNav'

export const metadata: Metadata = {
  title: 'Alignment — The Canon',
  description: 'Arena: the applied alignment field where canonical coherence is tested under pressure.',
}

export default function AlignmentPage() {
  const navItem = findCanonNavItem('alignment')
  const { eyebrow, title, intro, canonicalRole, measures, loop, misalignmentSignals, summary } = ALIGNMENT_CONTENT

  return (
    <CanonPageLayout>
      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
          {eyebrow}
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          Framework / Alignment
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
          {canonicalRole.heading}
        </p>
        <p className="mt-2 max-w-2xl text-base leading-7" style={{ color: 'var(--ink)' }}>
          {canonicalRole.body}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          {measures.heading}
        </p>
        <CanonPairGrid items={measures.items} />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          {loop.heading}
        </p>
        <div className="mt-3 flex flex-wrap items-start gap-x-2 gap-y-4">
          {loop.steps.map((step, index) => (
            <div key={step} className="flex items-start gap-2">
              {index > 0 && (
                <span aria-hidden="true" className="mt-1 text-sm" style={{ color: 'var(--gold)' }}>
                  →
                </span>
              )}
              <div className="flex flex-col items-center text-center">
                <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  {step}
                </span>
                <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>
                  {loop.operatorLabels[index]}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          {loop.note}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          {misalignmentSignals.heading}
        </p>
        <CanonPairGrid items={misalignmentSignals.items} />
      </div>

      <div className="border-t pt-8" style={{ borderColor: 'var(--paper-line)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          {summary.heading}
        </p>
        <p className="mt-2 max-w-2xl text-base leading-7" style={{ color: 'var(--ink)' }}>
          {summary.body}
        </p>
      </div>

      {navItem?.legacyHref && <OpenInFullCanon href={navItem.legacyHref} label="Open Alignment in the Full Canon" />}
    </CanonPageLayout>
  )
}
