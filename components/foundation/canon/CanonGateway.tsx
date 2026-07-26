import { CANON_GATEWAY_CARD_IDS, CANON_NAV_ITEMS } from '@/lib/content/canonNav'

// Compact bridge from the institutional overview into the live Canon
// environment at canon.avatark.ai -- concise cards, not a copy of that
// site's own navigation. Copy is sourced from canonNav.ts so the
// destination matrix stays the single place these URLs/descriptions live.
export function CanonGateway() {
  const cards = CANON_GATEWAY_CARD_IDS.map((id) => CANON_NAV_ITEMS.find((item) => item.id === id)).filter(
    (item): item is (typeof CANON_NAV_ITEMS)[number] => item !== undefined
  )
  const fullCanon = CANON_NAV_ITEMS.find((item) => item.id === 'explore-full-canon')

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Explore the Canon</h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <a
            key={card.id}
            href={card.href}
            aria-label={`${card.label} (opens canon.avatark.ai)`}
            className="rounded-lg border p-4 transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)', outlineColor: 'var(--gold)' }}
          >
            <p className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {card.label}
              <span aria-hidden="true" style={{ color: 'var(--gold)' }}>
                ↗
              </span>
            </p>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
              {card.description}
            </p>
          </a>
        ))}
      </div>
      {fullCanon && (
        <a
          href={fullCanon.href}
          className="mt-6 inline-block rounded-md px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: 'var(--gold)', color: 'var(--midnight)', outlineColor: 'var(--ink)' }}
        >
          Enter the Full Canon →
        </a>
      )}
    </div>
  )
}
