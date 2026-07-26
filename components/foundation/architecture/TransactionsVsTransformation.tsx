// Diagram 1: two small SVGs sharing the same node positions on the x-axis --
// Transactions are flat, isolated dots (nothing connects them); Transformation
// is the same count of points rising and joined into one line. Same viewBox
// scaling convention as LivingSpiral.tsx/FounderGeometry.tsx (h-auto w-full,
// no fixed pixel width), so nothing clips on mobile.
const POINTS_X = [24, 78, 132, 186, 216]

const TRANSACTION_Y = [56, 56, 56, 56, 56]
const TRANSFORMATION_Y = [86, 70, 54, 38, 22]

function Panel({
  eyebrow,
  caption,
  points,
  connected,
}: {
  eyebrow: string
  caption: string
  points: { x: number; y: number }[]
  connected: boolean
}) {
  return (
    <div className="rounded-lg border p-5" style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}>
      <p className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
        {eyebrow}
      </p>
      <p className="mt-0.5 text-sm" style={{ color: 'var(--ink-dim)' }}>
        → {caption}
      </p>
      <svg viewBox="0 0 240 100" className="mt-4 h-auto w-full" role="img" aria-hidden="true">
        {connected && (
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="var(--gold)"
            strokeWidth={2}
          />
        )}
        {points.map((p, index) => (
          <circle
            key={index}
            cx={p.x}
            cy={p.y}
            r={5}
            fill={connected ? 'var(--paper)' : 'var(--ink-dim)'}
            stroke={connected ? 'var(--gold)' : 'none'}
            strokeWidth={connected ? 2 : 0}
            opacity={connected ? 1 : 0.6}
          />
        ))}
      </svg>
    </div>
  )
}

export function TransactionsVsTransformation() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      role="img"
      aria-label="Transactions record what happened, as isolated events. Transformation connects the same moments into what changed in the person."
    >
      <Panel
        eyebrow="Transactions"
        caption="what happened"
        points={POINTS_X.map((x, i) => ({ x, y: TRANSACTION_Y[i] }))}
        connected={false}
      />
      <Panel
        eyebrow="Transformation"
        caption="what changed in the person"
        points={POINTS_X.map((x, i) => ({ x, y: TRANSFORMATION_Y[i] }))}
        connected
      />
    </div>
  )
}
