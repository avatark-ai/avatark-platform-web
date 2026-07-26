// Diagram 3: the same flex+arrow step-sequence pattern already used for
// Dynamics' transition cycles on /canon/dynamics -- plain CSS, no SVG
// needed for a linear flow like this one.
const STEPS = ['Experience', 'Reflection', 'Practice', 'Evidence', 'Contribution', 'Inheritance']

export function ArchitectureOfBecomingFlow() {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 rounded-lg border p-5"
      style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
      role="img"
      aria-label={`The Architecture of Becoming: ${STEPS.join(' leads to ')}`}
    >
      {STEPS.map((step, index) => (
        <span key={step} className="inline-flex items-center gap-2">
          {index > 0 && (
            <span aria-hidden="true" style={{ color: 'var(--gold)' }}>
              →
            </span>
          )}
          <span className="text-sm font-semibold sm:text-base" style={{ color: 'var(--ink)' }}>
            {step}
          </span>
        </span>
      ))}
    </div>
  )
}
