import type { Metadata } from 'next'
import { InstitutionalShell } from '@/components/foundation/InstitutionalShell'
import { getRoadmapContent } from '@/lib/content/foundation'
import { getEcosystemStatusEntries, STATUS_GROUP_ORDER } from '@/lib/content/statusGroups'

export const metadata: Metadata = {
  title: 'Roadmap — AvatarK',
  description: 'Where the AvatarK ecosystem actually stands today, and the shape every product climbs toward.',
}

export default function RoadmapPage() {
  const roadmap = getRoadmapContent()
  const entries = getEcosystemStatusEntries()

  return (
    <InstitutionalShell>
      <main className="flex flex-1 flex-col">
        <article className="mx-auto w-full max-w-2xl px-6 py-20 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
            {roadmap.subtitle}
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{roadmap.title}</h1>

          <div className="mt-10 flex flex-col gap-6 text-lg leading-8" style={{ color: 'var(--ink)' }}>
            {roadmap.intro.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          <section className="mt-12">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>
              Today
            </h2>
            <p className="mt-3 text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
              {roadmap.today}
            </p>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {STATUS_GROUP_ORDER.map((group) => {
                const items = entries.filter((entry) => entry.status === group.status)
                return (
                  <div key={group.status}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
                      {group.label}
                    </h3>
                    <ul className="mt-2 flex flex-col gap-1">
                      {items.length === 0 && (
                        <li className="text-sm" style={{ color: 'var(--ink-dim)' }}>
                          —
                        </li>
                      )}
                      {items.map((entry) => (
                        <li key={entry.id} className="text-sm" style={{ color: 'var(--ink)' }}>
                          {entry.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--ink)' }}>
              The maturity ladder
            </h2>
            <p className="mt-3 text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
              {roadmap.ladder}
            </p>
          </section>
        </article>
      </main>
    </InstitutionalShell>
  )
}
