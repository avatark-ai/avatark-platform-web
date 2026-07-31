import { RevealOnView, type Point } from '@avatark/motion'
import { ConnectionLine } from './ConnectionLine'

// The one-page mental model for the whole ecosystem: AvatarK (institutional
// home) -> Echo (consumer entry) -> three equal Growth Engines -> ArenaK ->
// StreamK -> CinemaK (the Expression Layer). Two independently laid-out
// SVGs, gated by the same `hidden sm:block` / `sm:hidden` convention Canon.tsx
// already uses for its desktop-tabs/mobile-accordion split, rather than one
// SVG rescaled -- the brief asks for a genuinely different arrangement
// (branching tree vs. a single vertical stack), not just a smaller version
// of the same layout. Both share the same node/edge/timing data below so
// the two can't drift out of sync with each other.
//
// Motion (plays once, when scrolled into view): AvatarK emerges -> line
// draws to Echo -> Echo emerges -> lines fan out to the three Growth
// Engines -> the three emerge together -> lines converge into ArenaK ->
// ArenaK emerges -> line to StreamK -> StreamK emerges -> line to CinemaK ->
// CinemaK emerges. Entirely staged off the shared EMERGE/DRAW primitives via
// --motion-delay, same technique as FourAxesGeometry/LivingSpiral. Settles
// in under 2s (see PLATFORM_DIAGRAM_SETTLE_MS below), then AvatarK -- the
// one root every other node traces back to -- gets a barely-there ongoing
// breathe, the diagram's only ambient motion after that.
const NODE_EMERGE_MS = 500 // kept in sync by hand with --motion-duration-emerge
const STEP_MS = 140

const STAGE = {
  avatark: STEP_MS * 0,
  lineAvatarkEcho: STEP_MS * 1,
  echo: STEP_MS * 2,
  linesEchoEngines: STEP_MS * 3,
  engines: STEP_MS * 4,
  linesEnginesArena: STEP_MS * 5,
  arena: STEP_MS * 6,
  lineArenaStream: STEP_MS * 7,
  stream: STEP_MS * 8,
  lineStreamCinema: STEP_MS * 9,
  cinema: STEP_MS * 10,
} as const

// Exported so PlatformArchitecture can delay whatever follows the diagram
// (if anything ever needs to) until the entrance has actually settled,
// rather than guessing the number a second time.
export const PLATFORM_DIAGRAM_SETTLE_MS = STAGE.cinema + NODE_EMERGE_MS

type StageKey = keyof typeof STAGE

interface DiagramNode {
  id: string
  label: string
  sublabel?: string
  stage: StageKey
}

const NODES: DiagramNode[] = [
  { id: 'avatark', label: 'AvatarK', stage: 'avatark' },
  { id: 'echo', label: 'Echo', stage: 'echo' },
  { id: 'prometheusk', label: 'PrometheusK', sublabel: 'Practice', stage: 'engines' },
  { id: 'gamek', label: 'GameK', sublabel: 'Exploration', stage: 'engines' },
  { id: 'atlask', label: 'Atlas', sublabel: 'Knowledge', stage: 'engines' },
  { id: 'arenak', label: 'ArenaK', stage: 'arena' },
  { id: 'streamk', label: 'StreamK', stage: 'stream' },
  { id: 'cinemak', label: 'CinemaK', stage: 'cinema' },
]

const EDGES: { from: string; to: string; stage: StageKey }[] = [
  { from: 'avatark', to: 'echo', stage: 'lineAvatarkEcho' },
  { from: 'echo', to: 'prometheusk', stage: 'linesEchoEngines' },
  { from: 'echo', to: 'gamek', stage: 'linesEchoEngines' },
  { from: 'echo', to: 'atlask', stage: 'linesEchoEngines' },
  { from: 'prometheusk', to: 'arenak', stage: 'linesEnginesArena' },
  { from: 'gamek', to: 'arenak', stage: 'linesEnginesArena' },
  { from: 'atlask', to: 'arenak', stage: 'linesEnginesArena' },
  { from: 'arenak', to: 'streamk', stage: 'lineArenaStream' },
  { from: 'streamk', to: 'cinemak', stage: 'lineStreamCinema' },
]

const DESKTOP_POSITIONS: Record<string, Point> = {
  avatark: { x: 380, y: 42 },
  echo: { x: 380, y: 122 },
  prometheusk: { x: 140, y: 224 },
  gamek: { x: 380, y: 224 },
  atlask: { x: 620, y: 224 },
  arenak: { x: 380, y: 322 },
  streamk: { x: 380, y: 380 },
  cinemak: { x: 380, y: 436 },
}

const MOBILE_POSITIONS: Record<string, Point> = {
  avatark: { x: 150, y: 38 },
  echo: { x: 150, y: 96 },
  prometheusk: { x: 58, y: 176 },
  gamek: { x: 150, y: 176 },
  atlask: { x: 242, y: 176 },
  arenak: { x: 150, y: 256 },
  streamk: { x: 150, y: 316 },
  cinemak: { x: 150, y: 376 },
}

function renderDiagram(positions: Record<string, Point>, radius: number) {
  return (
    <>
      {EDGES.map((edge) => (
        <ConnectionLine
          key={`${edge.from}-${edge.to}`}
          points={[positions[edge.from], positions[edge.to]]}
          delayMs={STAGE[edge.stage]}
        />
      ))}

      {NODES.map((node) => {
        const point = positions[node.id]
        return (
          <g key={node.id} className="motion-emerge" style={{ '--motion-delay': `${STAGE[node.stage]}ms` } as React.CSSProperties}>
            {node.id === 'avatark' && (
              <circle
                cx={point.x}
                cy={point.y}
                r={radius + 6}
                fill="var(--gold)"
                fillOpacity={0.35}
                className="motion-breathe"
                style={{ '--motion-delay': `${PLATFORM_DIAGRAM_SETTLE_MS}ms` } as React.CSSProperties}
              />
            )}
            <circle cx={point.x} cy={point.y} r={radius} fill="var(--paper)" stroke="var(--gold)" strokeWidth={2.5} />
            <text
              x={point.x}
              y={point.y - radius - 8}
              textAnchor="middle"
              className="text-[14px] font-semibold"
              fill="var(--ink)"
            >
              {node.label}
            </text>
            {node.sublabel && (
              <text x={point.x} y={point.y + radius + 18} textAnchor="middle" className="text-[12px]" fill="var(--ink-dim)">
                {node.sublabel}
              </text>
            )}
          </g>
        )
      })}
    </>
  )
}

const DIAGRAM_ARIA_LABEL =
  'AvatarK, the institutional home, leads to Echo, the consumer entry point. Echo opens into three equal Growth Engines: PrometheusK for practice, GameK for exploration, and Atlas for knowledge. All three converge into ArenaK, the community layer, which flows into StreamK, the media layer, and then CinemaK, the long-form storytelling layer.'

export function PlatformDiagram() {
  return (
    <RevealOnView sessionKey="platform-diagram">
      <div
        className="mx-auto max-w-5xl rounded-lg border p-6 sm:p-8"
        style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
      >
        {/* RC4 final polish: desktop viewBox tightened from "0 0 760 460"
            (760 wide) to 680 wide, cropping ~40px of excess margin off each
            side -- node/edge coordinates below are unchanged, this only
            narrows the visible window onto them. Mobile viewBox is left as
            "0 0 300 410": its content already runs close to those edges, so
            tightening it further would risk clipping label text. */}
        <svg viewBox="40 0 680 460" className="hidden h-auto w-full sm:block" role="img" aria-label={DIAGRAM_ARIA_LABEL}>
          {renderDiagram(DESKTOP_POSITIONS, 16)}
        </svg>
        <svg viewBox="0 0 300 410" className="h-auto w-full sm:hidden" role="img" aria-label={DIAGRAM_ARIA_LABEL}>
          {renderDiagram(MOBILE_POSITIONS, 12)}
        </svg>
      </div>
    </RevealOnView>
  )
}
