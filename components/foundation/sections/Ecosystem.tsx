import { getEcosystemGroups } from '@/lib/content/ecosystemGroups'
import { SectionContainer } from '@/components/foundation/Container'

export function Ecosystem() {
  const groups = getEcosystemGroups()

  return (
    <section id="ecosystem" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <SectionContainer>
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">The Ecosystem</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
            Organized around what you came to do, not which product you happen to land in.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex flex-col rounded-lg border p-6"
              style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
            >
              <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                {group.label}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
                {group.body}
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {group.products.map((product) => (
                  <li
                    key={product.id}
                    className="border-t pt-3 first:border-t-0 first:pt-0"
                    style={{ borderColor: 'var(--paper-line)' }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                        {product.name}
                      </span>
                      <span
                        className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--gold)' }}
                      >
                        {product.statusLabel}
                      </span>
                    </div>
                    {product.purpose && (
                      <p className="mt-1 text-xs leading-5" style={{ color: 'var(--ink-dim)' }}>
                        {product.purpose}
                      </p>
                    )}
                    <div className="mt-1.5">
                      {product.href ? (
                        <a
                          href={product.href}
                          className="rounded-sm text-xs font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                          style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
                        >
                          Open →
                        </a>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>
                          Not yet available
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionContainer>
    </section>
  )
}
