import { FOUNDER_SCIENCE_COPY as S } from '@/lib/content/founderScienceCopy'
import { LIVING_WORLDS_COPY as L } from '@/lib/content/livingWorldsCopy'

// AVK-FOUNDER-SCIENCE-02 (AVK-FS-FC-01, FC-02): Echo <-> Living Worlds closing
// transition on /founder/future, before "Continue the Journey". The status line is
// the approved AVK-FLW-FD-07 rendered from its single source; AVK-FS-FC-03's first
// sentence ("Both are still being built.") is omitted by owner decision (D-06).
export function FounderEchoLivingWorlds() {
  return (
    <section
      aria-labelledby="echo-and-living-worlds-heading"
      data-testid="founder-echo-living-worlds"
      className="mt-10 border-t pt-8"
      style={{ borderColor: 'var(--paper-line)' }}
    >
      <h2 id="echo-and-living-worlds-heading" className="text-2xl font-semibold tracking-tight">
        {S['AVK-FS-FC-01']}
      </h2>
      <p className="mt-4 text-lg leading-8" style={{ color: 'var(--ink)' }}>
        {S['AVK-FS-FC-02']}
      </p>
      <p className="mt-3 text-sm font-medium leading-6" style={{ color: 'var(--ink)' }}>
        {L['AVK-FLW-FD-07']}
      </p>
    </section>
  )
}
