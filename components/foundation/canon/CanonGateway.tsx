import Link from 'next/link'
import { CANON_FUTURE_ITEMS, CANON_GATEWAY_CARD_IDS, CANON_NAV_ITEMS } from '@/lib/content/canonNav'
import { RevealOnView } from '@avatark/motion'

// Bridge from the Canon overview into the three reader pages -- these are
// local institutional routes, so a click stays inside the institutional
// shell. Copy is sourced from canonNav.ts so the destination matrix stays
// the single place these routes/descriptions live. The Canon now lives
// entirely inside AvatarK: there is no outbound "Enter the Full Canon" CTA
// anymore. In its place, a "Coming Next" list names the living chapters
// still being written into this gateway.
export function CanonGateway() {
  const cards = CANON_GATEWAY_CARD_IDS.map((id) => CANON_NAV_ITEMS.find((item) => item.id === id)).filter(
    (item): item is (typeof CANON_NAV_ITEMS)[number] => item !== undefined && item.institutionalHref !== undefined
  )

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Explore the Canon</h2>
      <RevealOnView className="motion-emerge-stagger mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.institutionalHref as string}
            className="rounded-lg border p-4 transition hover:-translate-y-1 hover:border-[var(--gold)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0 active:shadow-sm"
            style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)', outlineColor: 'var(--gold)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {card.label}
            </p>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
              {card.description}
            </p>
          </Link>
        ))}
      </RevealOnView>

      <div className="mt-10 border-t pt-8" style={{ borderColor: 'var(--paper-line)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          Coming Next
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
          {CANON_FUTURE_ITEMS.map((item) => (
            <li key={item.id} className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>
              {item.label}
            </li>
          ))}
        </ul>
        <p className="mt-5 max-w-xl text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
          These are living chapters that will appear here.
        </p>
      </div>
    </div>
  )
}
