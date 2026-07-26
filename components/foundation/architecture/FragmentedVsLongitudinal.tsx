// Diagram 2: the same six labels rendered twice -- once scattered at
// uneven heights with no connecting line ("currently separated"), once
// resting on a single connected spine at one consistent height ("one
// longitudinal human architecture"). Pure geometry (offset + a line), no
// icons, same node/line convention as LivingSpiral.tsx.
const LABELS = ['Profile', 'Practice', 'Evidence', 'Story', 'Health', 'Community']
const X_POSITIONS = [60, 156, 252, 348, 444, 540]
const SCATTER_OFFSETS = [-18, 14, -10, 20, -16, 10]
const BASE_Y = 70

function ScatteredPanel() {
  return (
    <svg viewBox="0 0 600 130" className="h-auto w-full" role="img" aria-hidden="true">
      {LABELS.map((label, index) => {
        const x = X_POSITIONS[index]
        const y = BASE_Y + SCATTER_OFFSETS[index]
        return (
          <g key={label}>
            <circle cx={x} cy={y} r={5} fill="var(--ink-dim)" opacity={0.6} />
            <text x={x} y={y + 22} textAnchor="middle" className="text-[15px]" fill="var(--ink-dim)">
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function SpinePanel() {
  const first = X_POSITIONS[0]
  const last = X_POSITIONS[X_POSITIONS.length - 1]

  return (
    <svg viewBox="0 0 600 130" className="h-auto w-full" role="img" aria-hidden="true">
      <line x1={first} y1={BASE_Y} x2={last} y2={BASE_Y} stroke="var(--gold)" strokeWidth={2} />
      {LABELS.map((label, index) => {
        const x = X_POSITIONS[index]
        return (
          <g key={label}>
            <circle cx={x} cy={BASE_Y} r={6} fill="var(--paper)" stroke="var(--gold)" strokeWidth={2.5} />
            <text x={x} y={BASE_Y + 24} textAnchor="middle" className="text-[15px] font-semibold" fill="var(--ink)">
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function FragmentedVsLongitudinal() {
  return (
    <div
      className="rounded-lg border p-5"
      style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
      role="img"
      aria-label={`${LABELS.join(', ')} currently sit in separate, disconnected places. One longitudinal human architecture instead holds all six on a single connected timeline.`}
    >
      <p className="text-center text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>
        Currently separated
      </p>
      <ScatteredPanel />

      <p className="mt-2 text-center text-xl" style={{ color: 'var(--gold)' }} aria-hidden="true">
        ↓
      </p>

      <p className="text-center text-sm font-semibold" style={{ color: 'var(--ink)' }}>
        One longitudinal human architecture
      </p>
      <SpinePanel />
    </div>
  )
}
