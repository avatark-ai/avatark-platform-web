import { FOUNDER_SCIENCE_COPY as S } from '@/lib/content/founderScienceCopy'

// AVK-FOUNDER-SCIENCE-02 (AVK-FS-FI-01..05): /founder landing introduction, placed
// above the letter and outside it -- Chapter 1 and its title "From Possibility to
// Reality" (the page's h1) are unchanged. FI-02 is an h2 by owner decision D-02.
export function FounderLeadIn() {
  return (
    <section
      aria-labelledby="from-questions-to-worlds"
      data-testid="founder-lead-in"
      className="mb-10 border-b pb-8"
      style={{ borderColor: 'var(--paper-line)' }}
    >
      {/* --ink-dim, not --gold: gold text-xs on paper fails AA contrast (axe). */}
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
        {S['AVK-FS-FI-01']}
      </p>
      <h2 id="from-questions-to-worlds" className="mt-2 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
        {S['AVK-FS-FI-02']}
      </h2>
      <div className="mt-5 flex flex-col gap-4 text-lg leading-8" style={{ color: 'var(--ink)' }}>
        <p>{S['AVK-FS-FI-03']}</p>
        <p>{S['AVK-FS-FI-04']}</p>
      </div>
      <p className="mt-4 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
        {S['AVK-FS-FI-05']}
      </p>
    </section>
  )
}
