import { polylineLength, type Point } from '@/lib/motion/pathLength'

// Reusable connector for PlatformDiagram/ExpressionLayer: computes its own
// stroke-dasharray/dashoffset from its own points so the DRAW primitive
// always draws the connector's true length, never a guessed dasharray that
// would look mostly-finished on the first frame (same reasoning as
// FourAxesGeometry/LivingSpiral's own length calculations). Accepts a
// polyline (2+ points) rather than just two endpoints so a caller can draw
// an elbow connector, not only a straight segment.
export function ConnectionLine({
  points,
  delayMs = 0,
  fast = true,
  emphasized = false,
}: {
  points: Point[]
  delayMs?: number
  // motion-draw-fast (450ms) for one segment within a larger staged
  // sequence; motion-draw (1100ms) for a single standalone line. Every
  // caller in this pass uses the default -- PlatformDiagram/ExpressionLayer
  // both stage many segments in one sequence.
  fast?: boolean
  emphasized?: boolean
}) {
  const length = polylineLength(points)
  const d = `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`

  return (
    <path
      d={d}
      fill="none"
      stroke={emphasized ? 'var(--gold)' : 'var(--paper-line)'}
      strokeWidth={emphasized ? 2.5 : 2}
      strokeDasharray={length}
      strokeDashoffset={length}
      className={fast ? 'motion-draw-fast' : 'motion-draw'}
      style={{ '--motion-delay': `${delayMs}ms` } as React.CSSProperties}
    />
  )
}
