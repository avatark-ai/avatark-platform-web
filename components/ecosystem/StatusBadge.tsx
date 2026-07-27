// Platform-wide "how real is this today" signal, shared by GrowthEngineCard
// and ExpressionLayer so the six products (PrometheusK/GameK/AtlasK/ArenaK/
// StreamK/CinemaK) read on one consistent scale rather than each section
// inventing its own. Reuses the exact bordered-pill shape already used for
// ActivityCard's "Beta" pill and CanonRail's "Soon" pill -- no new colors,
// no filled/solid badge, no colored dot: just that pill's border+text color
// stepped down through the existing ink scale (gold -> ink -> ink-dim ->
// paper-line) as a product moves from LIVE toward VISION.
const STATUS_STYLE = {
  LIVE: { color: 'var(--gold)', borderColor: 'var(--gold)' },
  PREVIEW: { color: 'var(--ink)', borderColor: 'var(--ink)' },
  'COMING ONLINE': { color: 'var(--ink-dim)', borderColor: 'var(--ink-dim)' },
  'IN DEVELOPMENT': { color: 'var(--ink-dim)', borderColor: 'var(--ink-dim)' },
  VISION: { color: 'var(--ink-dim)', borderColor: 'var(--paper-line)' },
} as const

export type PlatformStatus = keyof typeof STATUS_STYLE

export function StatusBadge({ status }: { status: PlatformStatus }) {
  const style = STATUS_STYLE[status]
  return (
    <span
      className="whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{ color: style.color, borderColor: style.borderColor }}
    >
      {status}
    </span>
  )
}
