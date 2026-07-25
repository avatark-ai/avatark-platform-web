import { getLivingSpiralContent } from '@/lib/content/foundation'
import { SectionContainer } from '@/components/foundation/Container'

// Layout-only geometry for the five stage nodes -- not editorial content,
// so it stays here rather than in content/foundation/living-spiral.md.
// Order must match that file's "## Stages" list (Discover, Practice,
// Reflect, Adapt, Contribute).
const GEOMETRY = [
  { x: 160, y: 40, anchor: 'middle', dx: 0, dy: -14 },
  { x: 274, y: 123, anchor: 'start', dx: 12, dy: -4 },
  { x: 231, y: 257, anchor: 'middle', dx: 0, dy: 26 },
  { x: 89, y: 257, anchor: 'middle', dx: 0, dy: 26 },
  { x: 46, y: 123, anchor: 'end', dx: -12, dy: -4 },
] as const

// A clean, static diagram -- five nodes on a circle, connected in
// sequence, cycling back to Discover. No animation, per this milestone's
// explicit scope; the geometry itself (a closed loop, not a line) is what
// communicates "living" and "spiral" here.
export function LivingSpiral() {
  const content = getLivingSpiralContent()
  const stages = content.stages.map((label, index) => ({ label, ...GEOMETRY[index] }))

  return (
    <section id="living-spiral" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <SectionContainer>
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{content.title}</h2>
          {content.intro.map((paragraph) => (
            <p key={paragraph} className="mx-auto mt-4 max-w-xl text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-md">
          <svg
            viewBox="0 0 320 320"
            className="h-auto w-full"
            role="img"
            aria-label={`The Living Spiral: ${stages.map((s) => s.label).join(', ')}, in a continuous loop`}
          >
            <polygon
              points={stages.map((s) => `${s.x},${s.y}`).join(' ')}
              fill="none"
              stroke="var(--paper-line)"
              strokeWidth={1.5}
            />
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
          </svg>
        </div>
      </SectionContainer>
    </section>
  )
}
