import Link from 'next/link'
import { CANON_GATEWAY_CARD_IDS, CANON_NAV_ITEMS } from '@/lib/content/canonNav'
import { RevealOnView } from '@/components/motion/RevealOnView'

// Bridge from the Canon overview into the three reader pages -- these are
// now local institutional routes, not canon.avatark.ai deep links, so a
// click stays inside the institutional shell. Copy is sourced from
// canonNav.ts so the destination matrix stays the single place these
// routes/descriptions live. The one remaining external destination is the
// explicit "Enter the Full Canon" CTA at the bottom, for readers who want
// the complete legacy environment.
export function CanonGateway() {
  const cards = CANON_GATEWAY_CARD_IDS.map((id) => CANON_NAV_ITEMS.find((item) => item.id === id)).filter(
    (item): item is (typeof CANON_NAV_ITEMS)[number] => item !== undefined && item.institutionalHref !== undefined
  )
  const fullCanon = CANON_NAV_ITEMS.find((item) => item.id === 'explore-full-canon')

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Explore the Canon</h2>
      <RevealOnView className="motion-emerge-stagger mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.institutionalHref as string}
            className="rounded-lg border p-4 transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
      {fullCanon?.legacyHref && (
        <a
          href={fullCanon.legacyHref}
          aria-label={`${fullCanon.label} (opens canon.avatark.ai)`}
          className="mt-6 inline-block rounded-md px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: 'var(--gold)', color: 'var(--midnight)', outlineColor: 'var(--ink)' }}
        >
          Enter the Full Canon →
        </a>
      )}
    </div>
  )
}
