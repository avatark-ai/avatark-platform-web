import type { Metadata } from 'next'
import { InstitutionalLayout } from '@/components/foundation/InstitutionalLayout'
import { SectionContainer } from '@/components/foundation/Container'
import { resolveEcosystemProduct } from '@/lib/content/ecosystemGroups'

export const metadata: Metadata = {
  title: 'The AvatarK Ecosystem',
  description: 'One architecture. Many experiences. One journey of becoming.',
}

// Layout data, not editorial content -- deliberately not ecosystem.md's own
// groups (Watch/Understand there share products the way this page's cards
// no longer do: SetpointK gets its own Care card, and Watch is the one
// intentional exception, holding both StreamK and CinemaK). Every other
// card is exactly one product, matching one category.
const GRID = [
  { category: 'Begin', productIds: ['echo'] },
  { category: 'Practice', productIds: ['prometheusk'] },
  { category: 'Play', productIds: ['gamek'] },
  { category: 'Gather', productIds: ['arenak'] },
  { category: 'Watch', productIds: ['streamk', 'cinemak'] },
  { category: 'Create', productIds: ['studiok'] },
  { category: 'Understand', productIds: ['atlas'] },
  { category: 'Care', productIds: ['setpointk'] },
] as const

export default function EcosystemPage() {
  return (
    <InstitutionalLayout>
      <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <div className="mx-auto flex w-full max-w-[var(--editorial-width)] flex-col items-center gap-6 px-6 py-14 text-center sm:py-16">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            The AvatarK Ecosystem
          </h1>
          <div className="h-px w-16" style={{ background: 'var(--gold)' }} aria-hidden="true" />
          <div className="flex flex-col gap-2 text-lg leading-8 sm:text-xl" style={{ color: 'var(--ink-dim)' }}>
            <p>One architecture.</p>
            <p>Many experiences.</p>
            <p>One journey of becoming.</p>
          </div>
        </div>
      </section>

      <section>
        <SectionContainer>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {GRID.map((entry) => {
              const products = entry.productIds.map(resolveEcosystemProduct)
              return (
                <div
                  key={entry.category}
                  className="flex flex-col rounded-lg border p-5"
                  style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
                    {entry.category}
                  </p>
                  <ul className="mt-3 flex flex-col gap-3">
                    {products.map((product) => (
                      <li
                        key={product.id}
                        className="border-t pt-3 first:border-t-0 first:pt-0"
                        style={{ borderColor: 'var(--paper-line)' }}
                      >
                        <span className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
                          {product.name}
                        </span>
                        {product.purpose && (
                          <p className="mt-1.5 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
                            {product.purpose}
                          </p>
                        )}
                        <div className="mt-2">
                          <a
                            href={product.href ?? undefined}
                            className="rounded-sm text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                            style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
                          >
                            Open →
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </SectionContainer>
      </section>
    </InstitutionalLayout>
  )
}
