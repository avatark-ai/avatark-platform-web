import { getLivingSpiralContent } from '@/lib/content/foundation'
import { SectionContainer } from '@/components/foundation/Container'
import { RevealOnView } from '@/components/motion/RevealOnView'
import { polygonLength } from '@/lib/motion/pathLength'

// Layout-only geometry for the five stage nodes -- not editorial content,
// so it stays here rather than in content/foundation/living-spiral.md.
// Order must match that file's "## Stages" list (Discover, Practice,
// Reflect, Adapt, Contribute).
//
// viewBox is 470 wide (not a tight 320) specifically so the two
// side-anchored labels ("Practice", start-anchored; "Contribute",
// end-anchored) have room for their full word width without clipping --
// the circles themselves sit safely inside a narrower box, but
// anchor-based text extends a full word past the node position, which a
// 320-wide box didn't leave room for. Every x below is the original
// tighter-box coordinate shifted +75 to keep the geometry centered in the
// wider box.
const GEOMETRY = [
  { x: 235, y: 40, anchor: 'middle', dx: 0, dy: -14 },
  { x: 349, y: 123, anchor: 'start', dx: 12, dy: -4 },
  { x: 306, y: 257, anchor: 'middle', dx: 0, dy: 26 },
  { x: 164, y: 257, anchor: 'middle', dx: 0, dy: 26 },
  { x: 121, y: 123, anchor: 'end', dx: -12, dy: -4 },
] as const

// Five nodes on a circle, connected in sequence, cycling back to
// Discover -- the geometry itself (a closed loop, not a line) is what
// communicates "living" and "spiral" here. Silver surface, not Paper --
// this is the one structural/diagram section on the homepage.
//
// Motion (institutional pass): the loop draws itself once when scrolled
// into view, then settles into a slow, subtle BREATHE pulse -- signaling
// an ongoing practice, not a finished line. The five stage nodes emerge
// in a small cascade alongside it. No rotation, no loop-around-the-ring
// animation -- restrained on purpose.
export function LivingSpiral() {
  const content = getLivingSpiralContent()
  const stages = content.stages.map((label, index) => ({ label, ...GEOMETRY[index] }))
  const loopLength = polygonLength(stages)

  return (
    <section id="living-spiral" style={{ background: 'var(--silver-surface)' }}>
      <SectionContainer>
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{content.title}</h2>
          {content.intro.map((paragraph) => (
            <p key={paragraph} className="mx-auto mt-4 max-w-xl text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
              {paragraph}
            </p>
          ))}
        </div>

        <RevealOnView className="mx-auto mt-8 max-w-md">
          <svg
            viewBox="0 0 470 320"
            className="h-auto w-full"
            role="img"
            aria-label={`The Living Spiral: ${stages.map((s) => s.label).join(', ')}, in a continuous loop`}
          >
            <polygon
              points={stages.map((s) => `${s.x},${s.y}`).join(' ')}
              fill="none"
              stroke="var(--silver-accent)"
              strokeWidth={1.5}
              strokeDasharray={loopLength}
              strokeDashoffset={loopLength}
              className="motion-draw-then-breathe"
            />
            <g className="motion-emerge-stagger">
              {stages.map((stage) => (
                <g key={stage.label}>
                  <circle cx={stage.x} cy={stage.y} r={8} fill="var(--paper)" stroke="var(--gold)" strokeWidth={2} />
                  <text
                    x={stage.x + stage.dx}
                    y={stage.y + stage.dy}
                    textAnchor={stage.anchor}
                    className="text-[13px] font-semibold"
                    fill="var(--ink)"
                  >
                    {stage.label}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </RevealOnView>
      </SectionContainer>
    </section>
  )
}
