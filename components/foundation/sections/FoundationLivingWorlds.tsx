import Link from 'next/link'
import { EditorialContainer } from '@/components/foundation/Container'
import { APPROVED_COPY } from '@/lib/content/institutionalCopy'
import { LIVING_WORLDS_COPY as L, type LivingWorldsCopyId } from '@/lib/content/livingWorldsCopy'

// AVK-FOUNDER-LIVING-WORLDS-02 (AVK-FLW-FD-01..08, LW-10..19, ST-01..03):
// the /foundation "Why Living Worlds?" section and its compact Living Forest
// block. Text-only by design -- no VANAM artwork (WorldK's Face owns it), no
// WorldK link, no entry or visit claim. The "Discover Living Forest — Opening
// soon" pill is inert (no href, no handler), as on the homepage band.
//
// AVK-FLW-LW-12-R (the named WorldK facility line) is intentionally absent
// until the WorldK canon records it (C-2); see WORLDK-CANON-DEPENDENCIES.md.

type ChipId = 'AVK-FLW-ST-01' | 'AVK-FLW-ST-02' | 'AVK-FLW-ST-03'

export const LIVING_FOREST_LINES: ReadonlyArray<{
  id: LivingWorldsCopyId
  chip: ChipId
  credit?: LivingWorldsCopyId
}> = [
  { id: 'AVK-FLW-LW-11', chip: 'AVK-FLW-ST-01' },
  { id: 'AVK-FLW-LW-13', chip: 'AVK-FLW-ST-01' },
  { id: 'AVK-FLW-LW-14', chip: 'AVK-FLW-ST-01' },
  { id: 'AVK-FLW-LW-15-R', chip: 'AVK-FLW-ST-01' },
  { id: 'AVK-FLW-LW-16', chip: 'AVK-FLW-ST-01', credit: 'AVK-FLW-LW-16C' },
  { id: 'AVK-FLW-LW-17', chip: 'AVK-FLW-ST-02' },
  { id: 'AVK-FLW-LW-18-ALT', chip: 'AVK-FLW-ST-03' },
]

export const FOUNDER_WHY_LIVING_WORLDS_HREF = '/founder/future#why-living-worlds'

export function FoundationLivingWorlds() {
  return (
    <section
      id="living-worlds"
      aria-labelledby="foundation-living-worlds-heading"
      className="scroll-mt-4 border-t"
      style={{ borderColor: 'var(--paper-line)' }}
    >
      <EditorialContainer className="text-center">
        {/* --ink-dim, not --gold: gold text-xs on paper fails AA contrast (axe). */}
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
          {L['AVK-FLW-FD-01']}
        </p>
        <h2 id="foundation-living-worlds-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {L['AVK-FLW-FD-02']}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg font-medium leading-8" style={{ color: 'var(--ink)' }}>
          {L['AVK-FLW-FD-03']}
        </p>
        <div className="mx-auto mt-5 flex max-w-2xl flex-col gap-4 text-left text-base leading-7 sm:text-center" style={{ color: 'var(--ink-dim)' }}>
          <p>{L['AVK-FLW-FD-04']}</p>
          <p>{L['AVK-FLW-FD-05']}</p>
          <p>{L['AVK-FLW-FD-06']}</p>
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
            {L['AVK-FLW-FD-07']}
          </p>
        </div>

        <div
          className="mx-auto mt-10 max-w-2xl rounded-lg border p-5 text-left sm:p-6"
          style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
        >
          <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
            {L['AVK-FLW-LW-10']}
          </h3>
          <ul className="mt-4 flex flex-col gap-4">
            {LIVING_FOREST_LINES.map((line) => (
              <li key={line.id} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
                <span
                  data-testid="living-forest-status-chip"
                  className="inline-block w-fit shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold sm:mt-0.5 sm:w-32 sm:text-center"
                  style={{ borderColor: 'var(--paper-line)', color: 'var(--ink)' }}
                >
                  {L[line.chip]}
                </span>
                <span className="text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
                  <span data-copy-id={line.id}>{L[line.id]}</span>
                  {line.credit && (
                    <span className="mt-1 block text-xs leading-5" data-copy-id={line.credit}>
                      {L[line.credit]}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-6" style={{ color: 'var(--ink)' }}>
            {L['AVK-FLW-LW-19']}
          </p>
          <p className="mt-4">
            <span
              data-testid="living-forest-inert-pill"
              className="inline-block rounded-full border px-5 py-2 text-sm font-semibold"
              style={{ borderColor: 'var(--paper-line)', color: 'var(--ink-dim)' }}
            >
              {APPROVED_COPY['AVK-FR-024']} {APPROVED_COPY['AVK-FR-025']}
            </span>
          </p>
        </div>

        <p className="mt-8">
          <Link
            href={FOUNDER_WHY_LIVING_WORLDS_HREF}
            className="inline-block rounded-sm text-base font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--ink)', outlineColor: 'var(--focus-ring)' }}
          >
            {L['AVK-FLW-FD-08']}
          </Link>
        </p>
      </EditorialContainer>
    </section>
  )
}
