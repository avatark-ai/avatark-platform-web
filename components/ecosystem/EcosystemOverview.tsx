import { RevealOnView } from '@avatark/motion'
import { SectionContainer } from '@/components/foundation/Container'
import { StatusPill } from '@/components/foundation/StatusPill'
import { resolveEcosystemProduct } from '@/lib/content/ecosystemGroups'
import { ECOSYSTEM_OVERVIEW_GROUPS } from '@/lib/content/ecosystemOverview'
import { UNIFICATION_COPY as U } from '@/lib/content/unificationCopy'
import { APPROVED_COPY as C } from '@/lib/content/institutionalCopy'
import { LIVING_WORLDS_COPY as L } from '@/lib/content/livingWorldsCopy'

// AVK-UNIFICATION-03D (ECOSYSTEM-V3 §3): Level 1 visitor explanation -- Experiences · Making · Knowledge and
// Intelligence. Product chips are plain text, the same treatment as the homepage EcosystemPreview chips, so
// this section adds no links at all (no new external product links without release authorization; each
// product's existing link stays in the architecture section below). Each group is labelled by its own h2
// because no section heading is approved yet. Explanatory only: see lib/content/ecosystemOverview.ts.
export function EcosystemOverview() {
  return (
    <section id="ecosystem-overview" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <SectionContainer>
        <RevealOnView className="motion-emerge grid grid-cols-1 gap-6 md:grid-cols-3">
          {ECOSYSTEM_OVERVIEW_GROUPS.map((g) => {
            const headingId = `ecosystem-group-${g.key}`
            const products = g.productIds.map(resolveEcosystemProduct)
            return (
              <section
                key={g.key}
                aria-labelledby={headingId}
                data-ecosystem-group={g.key}
                className="rounded-2xl border p-6"
                style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
              >
                <h2 id={headingId} className="text-xl font-semibold tracking-tight">
                  {U[g.labelId]}
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {products.map((p) => (
                    <li key={p.id} className="rounded-full border px-3 py-1 text-sm font-medium" style={{ borderColor: 'var(--paper-line)', color: 'var(--ink)' }}>
                      {p.name}
                    </li>
                  ))}
                  {g.includesWorldK && (
                    <li key="worldk" data-testid="overview-worldk-chip" className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium" style={{ borderColor: 'var(--paper-line)', color: 'var(--ink)' }}>
                      {C['AVK-FR-055']}
                      <StatusPill text={L['AVK-FLW-ST-01']} tier="IN DEVELOPMENT" />
                    </li>
                  )}
                </ul>
              </section>
            )
          })}
        </RevealOnView>
      </SectionContainer>
    </section>
  )
}
