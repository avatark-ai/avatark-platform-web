// AVK-VISUAL-01B (OD-V4): code-drawn Living Forest geometry -- a river-valley horizon, four restrained
// valley contours, a gold-ink river meander and one geographic node. It replaces the empty fallback
// panel on /living-worlds with a deliberate drawing in the Canon / Echo geometric language.
//
// Decorative (aria-hidden, not focusable). No raster, no VANAM imagery, no rights-pending Living
// Forest master, no external request: inline SVG only, coloured from the institutional tokens.
const CONTOURS = [0, 1, 2, 3] as const

export function LivingForestGeometry({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 360"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-hidden="true"
      focusable="false"
      data-testid="living-forest-geometry"
    >
      <g fill="none" stroke="var(--ink-dim)" strokeLinecap="round">
        {/* River-valley horizon */}
        <path d="M40 210 H440" strokeWidth="1" opacity="0.9" />
        {/* Four valley contours, fading with distance */}
        {CONTOURS.map((i) => (
          <path
            key={i}
            d={`M${60 + i * 10} ${200 - i * 26} Q 240 ${120 - i * 30} ${420 - i * 10} ${200 - i * 26}`}
            strokeWidth="0.8"
            opacity={0.55 - i * 0.1}
          />
        ))}
      </g>
      {/* River meander and its reflection */}
      <g fill="none" stroke="var(--gold-ink)" strokeLinecap="round">
        <path d="M90 300 C 160 250, 200 330, 250 280 S 360 240, 400 300" strokeWidth="1.4" opacity="0.9" />
        <path d="M90 318 C 160 268, 200 348, 250 298 S 360 258, 400 318" strokeWidth="0.8" opacity="0.5" />
      </g>
      {/* One geographic node on the horizon */}
      <circle cx="250" cy="210" r="3" fill="var(--gold-ink)" />
    </svg>
  )
}
