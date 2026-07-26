import { RevealOnView } from '@/components/motion/RevealOnView'

// Diagram 3: the same flex+arrow step-sequence pattern already used for
// Dynamics' transition cycles on /canon/dynamics -- plain CSS, no SVG
// needed for a linear flow like this one.
//
// Motion: this is the one approved chain on the institutional site that
// reads as a full life/lineage progression (Experience through
// Inheritance), so it gets the fuller sequence -- each stage (with its
// connecting arrow) emerges in order, and once the chain settles,
// Inheritance -- the final node -- receives one restrained ripple.
const STEPS = ['Experience', 'Reflection', 'Practice', 'Evidence', 'Contribution', 'Inheritance']

export function ArchitectureOfBecomingFlow() {
  return (
    <RevealOnView>
      <div
        className="motion-emerge-stagger flex flex-wrap items-center justify-center gap-x-2 gap-y-3 rounded-lg border p-5"
        style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
        role="img"
        aria-label={`The Architecture of Becoming: ${STEPS.join(' leads to ')}`}
      >
        {STEPS.map((step, index) => {
          const isLast = index === STEPS.length - 1
          return (
            <span key={step} className="inline-flex items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" style={{ color: 'var(--gold)' }}>
                  →
                </span>
              )}
              <span className="relative text-sm font-semibold sm:text-base" style={{ color: 'var(--ink)' }}>
                {step}
                {isLast && (
                  <span
                    aria-hidden="true"
                    className="motion-ripple-once"
                    style={{ '--motion-delay': `${STEPS.length * 55 + 400}ms` } as React.CSSProperties}
                  />
                )}
              </span>
            </span>
          )
        })}
      </div>
    </RevealOnView>
  )
}
