import { RevealOnView } from '@/components/motion/RevealOnView'

// Part 3 of Platform Milestone 1: beneath the Growth Engines, name the
// platform primitives every engine actually shares, so the page states
// outright what the rest of it only implies -- these are one platform, not
// three separate products that happen to sit next to each other. "Shared
// Invitations" is included only for PrometheusK: that's the one engine with
// a confirmed invitation-gated handoff from Echo (see the invitation-
// practice-match enforcement on the PrometheusK handoff); GameK and AtlasK
// have no such confirmed gate today, so listing it there would overstate
// what this repo actually knows.
const CONNECTED = [
  {
    id: 'prometheusk',
    engineName: 'PrometheusK',
    uses: ['Echo Identity', 'Shared Account', 'Shared Motion', 'Shared Navigation', 'Shared Invitations'],
  },
  {
    id: 'gamek',
    engineName: 'GameK',
    uses: ['Echo Identity', 'Shared Account', 'Shared Motion', 'Shared Navigation'],
  },
  {
    id: 'atlas',
    engineName: 'AtlasK',
    uses: ['Echo Identity', 'Shared Account', 'Shared Motion', 'Shared Navigation'],
  },
] as const

export function ConnectedProducts() {
  return (
    <RevealOnView className="motion-emerge-stagger grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {CONNECTED.map((entry) => (
        <div
          key={entry.id}
          className="rounded-lg border p-5"
          style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {entry.engineName}
          </h3>
          {/* --ink-dim, not --gold: gold text against this card's
              --surface-card background measures ~1.98:1, under WCAG AA's
              4.5:1 -- --ink-dim clears ~7.3:1 here. */}
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
            Uses
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {entry.uses.map((use) => (
              <li key={use} className="text-sm" style={{ color: 'var(--ink-dim)' }}>
                {use}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </RevealOnView>
  )
}
