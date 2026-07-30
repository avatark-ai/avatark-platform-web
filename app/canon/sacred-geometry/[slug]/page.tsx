import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CanonPageLayout } from '@/components/foundation/canon/CanonPageLayout'
import { CANON_PLATES, getAdjacentPlates, getCanonPlate } from '@/lib/content/canonPlates'

export function generateStaticParams() {
  return CANON_PLATES.map((plate) => ({ slug: plate.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const plate = getCanonPlate(slug)
  if (!plate) return { title: 'Plate — Sacred Geometry' }
  return {
    title: `Plate ${plate.numeral} — ${plate.title} — The Canon`,
    description: plate.axiom ?? plate.subtitle,
  }
}

export default async function SacredGeometryPlatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const plate = getCanonPlate(slug)
  if (!plate) notFound()

  const { previous, next } = getAdjacentPlates(slug)

  return (
    <CanonPageLayout>
      <article>
        <p className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
          <Link href="/canon/sacred-geometry" className="hover:underline">
            Canon / Sacred Geometry
          </Link>{' '}
          / {plate.title}
        </p>

        <p className="mt-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          Plate {plate.numeral}
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{plate.title}</h1>
        <p className="mt-2 text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
          {plate.subtitle}
        </p>

        <div className="mt-8 overflow-hidden rounded-lg" style={{ background: 'var(--midnight)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={plate.imageSrc}
            alt={`Plate ${plate.numeral} — ${plate.title}`}
            className="mx-auto max-h-[480px] w-full object-contain"
          />
        </div>

        {plate.hasDetail ? (
          <div className="mt-10 flex flex-col gap-8">
            {plate.axiom && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
                  Axiom
                </p>
                <p className="mt-2 text-lg leading-8" style={{ color: 'var(--ink)' }}>
                  {plate.axiom}
                </p>
              </div>
            )}
            {plate.invariant && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
                  Invariant
                </p>
                <p className="mt-2 text-lg leading-8" style={{ color: 'var(--ink)' }}>
                  {plate.invariant}
                </p>
              </div>
            )}
            {plate.body && (
              <div className="flex flex-col gap-4">
                {plate.body.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className="mt-10 rounded-lg border p-6 text-sm leading-6"
            style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)', color: 'var(--ink-dim)' }}
          >
            The full reading for Plate {plate.numeral} — {plate.title} is still being written into the Canon. It
            will appear here once published.
          </div>
        )}

        <nav aria-label="Plate navigation" className="mt-12 flex items-center justify-between border-t pt-6" style={{ borderColor: 'var(--paper-line)' }}>
          {previous ? (
            <Link
              href={`/canon/sacred-geometry/${previous.slug}`}
              className="group flex flex-col rounded-sm text-sm transition-colors duration-200 hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: 'var(--ink-dim)', outlineColor: 'var(--gold)' }}
            >
              <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:-translate-x-1 group-focus-visible:-translate-x-1">
                ← Plate {previous.numeral}
              </span>
              <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                {previous.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/canon/sacred-geometry/${next.slug}`}
              className="group flex flex-col rounded-sm text-right text-sm transition-colors duration-200 hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: 'var(--ink-dim)', outlineColor: 'var(--gold)' }}
            >
              <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1">
                Plate {next.numeral} →
              </span>
              <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                {next.title}
              </span>
            </Link>
          )}
        </nav>
      </article>
    </CanonPageLayout>
  )
}
