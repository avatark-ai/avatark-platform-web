import { RevealOnView } from '@/components/motion/RevealOnView'
import { polylineLength } from '@/lib/motion/pathLength'

// Diagram 2: the same six labels rendered twice -- once scattered at
// uneven heights with no connecting line ("currently separated"), once
// resting on a single connected spine at one consistent height ("one
// longitudinal human architecture"). Pure geometry (offset + a line), no
// icons, same node/line convention as LivingSpiral.tsx. Motion: the
// scattered dots emerge individually (no line to draw -- there isn't
// one), then the spine draws itself and its nodes emerge, once scrolled
// into view.
const LABELS = ['Profile', 'Practice', 'Evidence', 'Story', 'Health', 'Community']
const X_POSITIONS = [60, 156, 252, 348, 444, 540]
const SCATTER_OFFSETS = [-18, 14, -10, 20, -16, 10]
const BASE_Y = 70

function ScatteredPanel() {
  return (
    <svg viewBox="0 0 600 130" className="h-auto w-full" role="img" aria-hidden="true">
      <g className="motion-emerge-stagger">
        {LABELS.map((label, index) => {
          const x = X_POSITIONS[index]
          const y = BASE_Y + SCATTER_OFFSETS[index]
          return (
            <g key={label} style={{ '--motion-emerge-to': 0.6 } as React.CSSProperties}>
              <circle cx={x} cy={y} r={5} fill="var(--ink-dim)" />
              <text x={x} y={y + 22} textAnchor="middle" className="text-[15px]" fill="var(--ink-dim)">
                {label}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

function SpinePanel() {
  const first = X_POSITIONS[0]
  const last = X_POSITIONS[X_POSITIONS.length - 1]
  const length = polylineLength([
    { x: first, y: BASE_Y },
    { x: last, y: BASE_Y },
  ])

  return (
    <svg viewBox="0 0 600 130" className="h-auto w-full" role="img" aria-hidden="true">
      <line
        x1={first}
        y1={BASE_Y}
        x2={last}
        y2={BASE_Y}
        stroke="var(--gold)"
        strokeWidth={2}
        strokeDasharray={length}
        strokeDashoffset={length}
        className="motion-draw"
      />
      <g className="motion-emerge-stagger">
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
      </g>
    </svg>
  )
}

export function FragmentedVsLongitudinal() {
  return (
    <RevealOnView>
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
    </RevealOnView>
  )
}
