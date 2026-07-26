import Link from 'next/link'
import { resolveEcosystemProduct } from '@/lib/content/ecosystemGroups'
import { SectionContainer } from '@/components/foundation/Container'

// Home's teaser for the Ecosystem, not the Ecosystem itself -- the full
// 4x2 grid with per-product purpose copy now lives only on /ecosystem
// (app/ecosystem/page.tsx). This just names the products, reusing the
// same resolver so the list can't drift from the real registry, then
// hands off to the dedicated page. CinemaK stays folded into StreamK, as
// on the Ecosystem page itself -- no ninth chip.
const PRODUCT_IDS = ['echo', 'prometheusk', 'gamek', 'arenak', 'streamk', 'studiok', 'atlas', 'setpointk'] as const

export function EcosystemPreview() {
  const products = PRODUCT_IDS.map(resolveEcosystemProduct)

  return (
    <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <SectionContainer className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">The Ecosystem</h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
          One architecture. Many experiences. One journey of becoming.
        </p>

        <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-5 gap-y-3">
          {products.map((product) => (
            <li
              key={product.id}
              className="rounded-full border px-3 py-1 text-sm font-medium"
              style={{ borderColor: 'var(--paper-line)', color: 'var(--ink)' }}
            >
              {product.name}
            </li>
          ))}
        </ul>

        <Link
          href="/ecosystem"
          className="mt-8 inline-block rounded-sm px-2 py-1 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
        >
          Learn More →
        </Link>
      </SectionContainer>
    </section>
  )
}
