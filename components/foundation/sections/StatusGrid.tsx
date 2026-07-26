import { getEcosystemStatusEntries, STATUS_GROUP_ORDER } from '@/lib/content/statusGroups'
import { SectionContainer } from '@/components/foundation/Container'

export function StatusGrid() {
  const entries = getEcosystemStatusEntries()

  return (
    <section id="status" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <SectionContainer>
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">From Philosophy to Platform</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
            Where the ecosystem actually stands today, not where a roadmap says it should be.
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {STATUS_GROUP_ORDER.map((group) => {
            const items = entries.filter((entry) => entry.status === group.status)
            return (
              <div key={group.status}>
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
                  {group.label}
                </h3>
                <ul className="mt-3 flex flex-col gap-3">
                  {items.length === 0 && (
                    <li className="text-sm" style={{ color: 'var(--ink-dim)' }}>
                      —
                    </li>
                  )}
                  {items.map((entry) => (
                    <li key={entry.id}>
                      <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                        {entry.name}
                      </p>
                      {entry.tagline && (
                        <p className="mt-0.5 text-xs leading-5" style={{ color: 'var(--ink-dim)' }}>
                          {entry.tagline}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </SectionContainer>
    </section>
  )
}
