import { SectionContainer } from '@/components/foundation/Container'
import { FOUNDER_SCIENCE_COPY as S } from '@/lib/content/founderScienceCopy'

// AVK-FOUNDER-SCIENCE-02 (AVK-FS-FM-01..55): "How AvatarK Investigates and Builds".
// Four working commitments of the engineering method -- deliberately NOT styled
// like the Canon's Four Axes (no geometry, no figures) and not the DT4 pillars.
// Placed after "Why AvatarK Exists" and before Living Worlds, which stays last.
// No ladder diagram in this build (D-10).
const COMMITMENTS = [
  { label: S['AVK-FS-FM-10'], body: S['AVK-FS-FM-11'] },
  { label: S['AVK-FS-FM-20'], body: S['AVK-FS-FM-21'] },
  { label: S['AVK-FS-FM-30'], body: S['AVK-FS-FM-31'] },
  { label: S['AVK-FS-FM-40'], body: S['AVK-FS-FM-41'] },
] as const

const STATEMENTS = [S['AVK-FS-FM-51'], S['AVK-FS-FM-52'], S['AVK-FS-FM-53'], S['AVK-FS-FM-54']] as const

export function FoundationMethod() {
  return (
    <section
      id="method"
      aria-labelledby="foundation-method-heading"
      className="scroll-mt-4 border-t"
      style={{ borderColor: 'var(--paper-line)' }}
    >
      <SectionContainer>
        <div className="text-center">
          {/* --ink-dim, not --gold: gold text-xs on paper fails AA contrast (axe). */}
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
            {S['AVK-FS-FM-01']}
          </p>
          <h2 id="foundation-method-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {S['AVK-FS-FM-02']}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8" style={{ color: 'var(--ink-dim)' }}>
            {S['AVK-FS-FM-03']}
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COMMITMENTS.map((item) => (
            <li
              key={item.label}
              className="rounded-md border p-5"
              style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
            >
              <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
                {item.label}
              </h3>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
                {item.body}
              </p>
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-10 max-w-2xl">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
            {S['AVK-FS-FM-50']}
          </h3>
          <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
            {STATEMENTS.map((statement) => (
              <li key={statement}>{statement}</li>
            ))}
          </ul>
          <p className="mt-6 text-base font-medium leading-7" style={{ color: 'var(--ink)' }}>
            {S['AVK-FS-FM-55']}
          </p>
        </div>
      </SectionContainer>
    </section>
  )
}
