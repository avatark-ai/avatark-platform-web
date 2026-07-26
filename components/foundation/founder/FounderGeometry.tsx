import { getCanonContent } from '@/lib/content/foundation'
import { RevealOnView } from '@/components/motion/RevealOnView'
import { polylineLength } from '@/lib/motion/pathLength'

// The one geometry illustration for the Founder page -- now the Synthesis
// route specifically, rendered prominently rather than as a small aside: a
// static cross, three axes (Awareness/Adiyogi, Wisdom/Krishna,
// Responsibility/Rama) in a row, with Prometheus/Creation as the
// perpendicular fourth axis below, echoing the letter's own "the
// perpendicular one" language. Labels/figures come from getCanonContent()
// -- the same real Four Axes data already used on the homepage, not
// invented for this page. viewBox-scaled like LivingSpiral's SVG, so it
// scales instead of clipping on mobile. Motion (institutional pass): the
// two axis lines draw themselves in, nodes emerge in a small cascade,
// once scrolled into view.
// Awareness/Responsibility sit on the horizontal line's own y, so their
// above/below labels never cross it. Wisdom/Creation anchor the vertical
// line instead, so their labels are offset sideways (labelAnchor/labelDx)
// to dodge it rather than sitting directly above/below.
const POSITIONS = [
  { x: 70, y: 60, labelAnchor: 'middle' as const, labelDx: 0 },
  { x: 200, y: 60, labelAnchor: 'end' as const, labelDx: -16 },
  { x: 330, y: 60, labelAnchor: 'middle' as const, labelDx: 0 },
  { x: 200, y: 220, labelAnchor: 'end' as const, labelDx: -16 },
] as const

export function FounderGeometry() {
  const { axes } = getCanonContent()
  const nodes = axes.map((axis, index) => ({ ...axis, ...POSITIONS[index] })).filter((node) => node.x !== undefined)

  if (nodes.length < 4) return null
  const [awareness, wisdom, responsibility, creation] = nodes
  const horizontalLength = polylineLength([awareness, responsibility])
  const verticalLength = polylineLength([wisdom, creation])

  return (
    <RevealOnView className="mx-auto my-12 max-w-lg sm:max-w-2xl">
      <svg
        viewBox="0 0 400 260"
        className="h-auto w-full"
        role="img"
        aria-label={`The four axes: ${nodes.map((node) => `${node.label} (${node.figure})`).join(', ')}`}
      >
        <line
          x1={awareness.x}
          y1={awareness.y}
          x2={responsibility.x}
          y2={responsibility.y}
          stroke="var(--paper-line)"
          strokeWidth={2}
          strokeDasharray={horizontalLength}
          strokeDashoffset={horizontalLength}
          className="motion-draw"
        />
        <line
          x1={wisdom.x}
          y1={wisdom.y}
          x2={creation.x}
          y2={creation.y}
          stroke="var(--paper-line)"
          strokeWidth={2}
          strokeDasharray={verticalLength}
          strokeDashoffset={verticalLength}
          className="motion-draw"
        />
        <g className="motion-emerge-stagger">
          {nodes.map((node) => (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r={10} fill="var(--paper)" stroke="var(--gold)" strokeWidth={3} />
              <text
                x={node.x + node.labelDx}
                y={node.labelAnchor === 'middle' ? node.y - 22 : node.y - 6}
                textAnchor={node.labelAnchor}
                className="text-[18px] font-semibold"
                fill="var(--ink)"
              >
                {node.label}
              </text>
              <text
                x={node.x + node.labelDx}
                y={node.labelAnchor === 'middle' ? node.y + 34 : node.y + 18}
                textAnchor={node.labelAnchor}
                className="text-[14px]"
                fill="var(--ink-dim)"
              >
                {node.figure}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </RevealOnView>
  )
}
