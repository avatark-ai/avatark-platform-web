import { RevealOnView } from '@avatark/motion'
import { SectionContainer } from '@/components/foundation/Container'
import { StatusPill } from '@/components/foundation/StatusPill'
import { PILLARS } from '@/components/foundation/sections/PillarsBand'
import { resolveEcosystemProduct } from '@/lib/content/ecosystemGroups'
import { ECOSYSTEM_OVERVIEW_GROUPS } from '@/lib/content/ecosystemOverview'
import { UNIFICATION_COPY as U } from '@/lib/content/unificationCopy'
import { APPROVED_COPY as C } from '@/lib/content/institutionalCopy'
import { LIVING_WORLDS_COPY as L } from '@/lib/content/livingWorldsCopy'
import { ECOSYSTEM_WORLDK_COPY as E } from '@/lib/content/ecosystemWorldkCopy'

// AVK-UNIFICATION-03D-1 (ECOSYSTEM-V3 §4): Level 2 "How the parts relate" -- a CONCEPTUAL reading order
// (AvatarK Holdings → four DT4 pillars → AvatarK Platform → products and experiences). It is not a legal
// ownership chart, a corporate structure or a deployment topology: no product is connected to a pillar, no
// lines or arrows imply ownership between specific nodes, and the approved note AVK-U03-EV-42 says the
// groupings change nothing about what a product is or who is responsible for it.
//
// Every label is existing approved copy or registry data: AVK-FR-030 "AvatarK Holdings"; PILLARS (the
// PillarsBand single source); the Platform tier is AVK-U03-EV-43 "AvatarK Platform" (approved, OD-EW-3);
// group labels + registry product names as in Level 1. It does not repeat PlatformArchitecture (no journey
// chain or links) and adds no links at all. AVK-FLW-EC-09 (Living Worlds → DT4M) is not repeated here: it is
// rendered once on this page, by ExperienceSystems.
//
// AVK-ECOSYSTEM-WORLDK-02 (OD-EW-1, OD-EW-5): promoted to directly after Level 1, and extended with an
// "Experience systems" tier (EW-01) holding Echo and WorldK as equal peers (same markup, EW-03 / EW-04, the
// approved "In development" status). That tier and the Products tier (EW-05) share one bordered container
// "built on the platform", with NO arrow between them: no product is shown as a child of Echo or of WorldK,
// and Echo / the WorldK chip are therefore not repeated in the Products tier. No product-to-pillar mapping.
function Step() {
  return (
    <div aria-hidden="true" className="flex justify-center py-3 text-lg" style={{ color: 'var(--ink-dim)' }}>
      ↓
    </div>
  )
}

// Echo and WorldK, in homepage order. Echo's name is the approved FX-10, WorldK's the approved FR-055 (it has
// no registry entry, OD-12). Both are excluded from the Products tier below so neither appears twice.
const SYSTEMS = [
  { key: 'echo', name: U['AVK-U03-FX-10'], line: E['AVK-EW-03'] },
  { key: 'worldk', name: C['AVK-FR-055'], line: E['AVK-EW-04'] },
] as const
const SYSTEM_IDS: ReadonlySet<string> = new Set(SYSTEMS.map((s) => s.key))

const TIER = 'rounded-2xl border p-6 text-center'
const TIER_STYLE = { borderColor: 'var(--paper-line)', background: 'var(--surface-card)' } as const

export function RelationshipArchitecture() {
  return (
    <section
      id="relationship-architecture"
      aria-labelledby="relationship-architecture-heading"
      data-diagram="conceptual"
      className="border-t"
      style={{ borderColor: 'var(--paper-line)' }}
    >
      <SectionContainer>
        <div className="mx-auto max-w-[var(--editorial-width)] text-center">
          <h2 id="relationship-architecture-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {U['AVK-U03-EV-40']}
          </h2>
          <p className="mt-4 text-lg leading-8" style={{ color: 'var(--ink-dim)' }}>
            {U['AVK-U03-EV-41']}
          </p>
        </div>

        <RevealOnView className="motion-emerge mx-auto mt-10 max-w-[var(--content-width)]">
          <ol data-testid="relationship-tiers" className="flex flex-col">
            <li data-tier="holdings">
              <div className={TIER} style={TIER_STYLE}>
                <h3 className="text-xl font-semibold tracking-tight">{C['AVK-FR-030']}</h3>
              </div>
              <Step />
            </li>
            <li data-tier="pillars">
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {PILLARS.map((p) => (
                  <li key={p.code} className="rounded-xl border px-4 py-3 text-center" style={{ borderColor: 'var(--paper-line)' }}>
                    <p className="text-sm font-semibold tracking-wider">{p.code}</p>
                    <p className="mt-1 text-sm leading-5" style={{ color: 'var(--ink-dim)' }}>
                      {p.name}
                    </p>
                  </li>
                ))}
              </ul>
              <Step />
            </li>
            <li data-tier="platform">
              <div className={TIER} style={TIER_STYLE}>
                <h3 className="text-xl font-semibold tracking-tight">{U['AVK-U03-EV-43']}</h3>
              </div>
              <Step />
            </li>
            <li data-tier="experience-systems" className="rounded-t-2xl border border-b-0 p-4 sm:p-6" style={{ borderColor: 'var(--paper-line)' }}>
              <h3 className="text-center text-base font-semibold">{E['AVK-EW-01']}</h3>
              <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {SYSTEMS.map((sys) => (
                  <li
                    key={sys.key}
                    data-system={sys.key}
                    className="flex flex-col items-center gap-2 rounded-xl border p-5 text-center"
                    style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
                  >
                    <h4 className="text-lg font-semibold tracking-tight">{sys.name}</h4>
                    <p className="text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
                      {sys.line}
                    </p>
                    <StatusPill text={L['AVK-FLW-ST-01']} tier="IN DEVELOPMENT" />
                  </li>
                ))}
              </ul>
            </li>
            <li data-tier="products" className="rounded-b-2xl border p-4 sm:p-6" style={{ borderColor: 'var(--paper-line)' }}>
              <h3 className="text-center text-base font-semibold">{E['AVK-EW-05']}</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {ECOSYSTEM_OVERVIEW_GROUPS.map((g) => (
                  <div key={g.key} className="rounded-xl border p-4" style={{ borderColor: 'var(--paper-line)' }}>
                    <h4 className="text-base font-semibold">{U[g.labelId]}</h4>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {g.productIds
                        .filter((id) => !SYSTEM_IDS.has(id))
                        .map(resolveEcosystemProduct)
                        .map((p) => (
                          <li key={p.id} className="rounded-full border px-3 py-1 text-sm" style={{ borderColor: 'var(--paper-line)' }}>
                            {p.name}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </li>
          </ol>
          <p data-testid="relationship-note" className="mx-auto mt-8 max-w-[var(--editorial-width)] text-center text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
            {U['AVK-U03-EV-42']}
          </p>
          <p data-testid="experience-systems-note" className="mx-auto mt-3 max-w-[var(--editorial-width)] text-center text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
            {E['AVK-EW-02']}
          </p>
        </RevealOnView>
      </SectionContainer>
    </section>
  )
}
