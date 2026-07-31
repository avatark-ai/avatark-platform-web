import { getLivingSpiralContent } from '@/lib/content/foundation'
import { SectionContainer } from '@/components/foundation/Container'
import { RevealOnView, polygonLength } from '@avatark/motion'

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

// Kept in sync by hand with the matching tokens in globals.css -- this
// diagram needs the actual numbers to sequence its own stages and to
// know when the loop has finished drawing (so the traveling signal and,
// after it returns, Discover's breathe can start at the right moment).
const NODE_STEP_MS = 90
const DRAW_MS = 1100
const TRAVEL_MS = 1600

// Five nodes on a circle, connected in sequence, cycling back to
// Discover -- the geometry itself (a closed loop, not a line) is what
// communicates "living" and "spiral" here. Silver surface, not Paper --
// this is the one structural/diagram section on the homepage.
//
// Motion (institutional pass): nodes emerge in conceptual order: Discover,
// Practice, Reflect, Adapt, Contribute. The loop draws itself once, then
// one small signal travels around it and fades out returning to
// Discover -- at which point Discover gets a barely-there ongoing
// breathe, the diagram's one ambient loop, signaling a continuing
// practice rather than a finished line. No rotation, no repeating chase
// around the ring. sessionKey means a same-session revisit to /canon
// shows this already settled instead of replaying the whole sequence.
export function LivingSpiral() {
  const content = getLivingSpiralContent()
  const stages = content.stages.map((label, index) => ({ label, ...GEOMETRY[index] }))
  const loopLength = polygonLength(stages)
  const pathData = `M ${stages.map((s) => `${s.x},${s.y}`).join(' L ')} Z`

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

        <RevealOnView className="mx-auto mt-8 max-w-md" sessionKey="living-spiral-intro">
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
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              strokeDasharray={loopLength}
              strokeDashoffset={loopLength}
              className="motion-draw"
            />

            {/* The traveling signal -- one pass around the loop, once. */}
            <circle
              r={5}
              fill="var(--gold)"
              className="motion-signal-travel"
              style={{ offsetPath: `path("${pathData}")`, '--motion-delay': `${DRAW_MS}ms` } as React.CSSProperties}
            />

            {stages.map((stage, index) => (
              <g key={stage.label} className="motion-emerge" style={{ '--motion-delay': `${index * NODE_STEP_MS}ms` } as React.CSSProperties}>
                {index === 0 && (
                  // A soft glow behind Discover, breathing gently once the
                  // signal above has completed its one lap -- the
                  // diagram's single ambient loop, not the node itself
                  // (avoids fighting the node's own emerge animation).
                  <circle
                    cx={stage.x}
                    cy={stage.y}
                    r={14}
                    fill="var(--gold)"
                    fillOpacity={0.35}
                    className="motion-breathe"
                    style={{ '--motion-delay': `${DRAW_MS + TRAVEL_MS}ms` } as React.CSSProperties}
                  />
                )}
                <circle
                  cx={stage.x}
                  cy={stage.y}
                  r={8}
                  fill="var(--paper)"
                  stroke="var(--gold)"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
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
          </svg>
        </RevealOnView>
      </SectionContainer>
    </section>
  )
}
