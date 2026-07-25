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
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
                {group.products.map((product) => (
                  <li key={product.id} className="text-sm font-medium">
                    {product.href ? (
                      <a
                        href={product.href}
                        className="rounded-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                        style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
                      >
                        {product.name}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--ink-dim)' }}>
                        {product.name}
                        <span className="ml-1 text-xs">{product.isEcho ? '(not yet built)' : '(coming soon)'}</span>
                      </span>
                    )}
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
