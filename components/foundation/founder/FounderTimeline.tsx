// Chips for the Founder page's two-column opening (left column). Distinct
// from Question.tsx's own homepage timeline -- same letter, different
// component, each with its own already-settled item list. All six terms
// here are drawn directly from the letter's own words (BITS Pilani,
// Setpoint, "master's degree in computer science", IBM, AvatarK), not
// invented for this page.
const FOUNDER_TIMELINE = ['1986', 'BITS Pilani', 'Setpoint', 'Computer Science', 'IBM', 'AvatarK'] as const

export function FounderTimeline() {
  return (
    <ol
      className="flex flex-row flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium sm:flex-col sm:items-start sm:gap-y-3"
      style={{ color: 'var(--ink-dim)' }}
    >
      {FOUNDER_TIMELINE.map((step, index) => (
        <li key={step} className="flex items-center gap-2">
          <span style={{ color: 'var(--ink)' }}>{step}</span>
          {index < FOUNDER_TIMELINE.length - 1 && (
            <span aria-hidden="true" className="sm:hidden" style={{ color: 'var(--gold)' }}>
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}
