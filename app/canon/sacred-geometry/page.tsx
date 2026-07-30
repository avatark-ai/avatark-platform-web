import type { Metadata } from 'next'
import Link from 'next/link'
import { CanonPageLayout } from '@/components/foundation/canon/CanonPageLayout'
import { RevealOnView } from '@/components/motion/RevealOnView'
import { CANON_PLATES } from '@/lib/content/canonPlates'

export const metadata: Metadata = {
  title: 'Sacred Geometry — The Canon',
  description: 'Plates I–XII: the constraints that govern how a system perceives, orders, and endures.',
}

export default function SacredGeometryPage() {
  return (
    <CanonPageLayout>
      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
          Canon / Sacred Geometry
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          Sacred Geometry
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Plates I–XII</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8" style={{ color: 'var(--ink-dim)' }}>
          Twelve plates, read as a sequence: each names a constraint that governs how a system perceives, orders,
          and endures. Study them in order, or open any plate directly.
        </p>
      </div>

      <RevealOnView className="motion-emerge-stagger grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CANON_PLATES.map((plate) => (
          <Link
            key={plate.slug}
            href={`/canon/sacred-geometry/${plate.slug}`}
            className="group flex flex-col overflow-hidden rounded-lg border transition hover:-translate-y-1 hover:border-[var(--gold)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-0 active:shadow-sm"
            style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)', outlineColor: 'var(--gold)' }}
          >
            <div className="aspect-[4/3] w-full overflow-hidden" style={{ background: 'var(--midnight)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={plate.imageSrc}
                alt={`Plate ${plate.numeral} — ${plate.title}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
              />
            </div>
            <div className="flex flex-1 flex-col p-4">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
                Plate {plate.numeral}
              </p>
              <p className="mt-1 text-base font-semibold" style={{ color: 'var(--ink)' }}>
                {plate.title}
              </p>
              <p className="mt-1 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
                {plate.subtitle}
              </p>
              <p
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"
                style={{ color: 'var(--ink)' }}
              >
                Open Plate
                <span aria-hidden="true" style={{ color: 'var(--gold)' }}>
                  →
                </span>
              </p>
            </div>
          </Link>
        ))}
      </RevealOnView>
    </CanonPageLayout>
  )
}
