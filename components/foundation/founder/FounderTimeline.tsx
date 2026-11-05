import { FOUNDER_SCIENCE_COPY as S } from '@/lib/content/founderScienceCopy'

// AVK-FOUNDER-SCIENCE-02 (AVK-FS-FT-*): verified founder timeline on /founder/future,
// after the portrait and outside the letter. Every entry restates only what the
// Founder Letter itself says; no AvatarK founding year (owner decision D-09).
const ITEMS = [
  { marker: S['AVK-FS-FT-10'], text: S['AVK-FS-FT-11'] },
  { marker: S['AVK-FS-FT-20'], text: S['AVK-FS-FT-21'] },
  { marker: S['AVK-FS-FT-30'], text: S['AVK-FS-FT-31'] },
  { marker: S['AVK-FS-FT-40'], text: S['AVK-FS-FT-41'] },
  { marker: S['AVK-FS-FT-50'], text: S['AVK-FS-FT-51'] },
] as const

export function FounderTimeline() {
  return (
    <section
      aria-labelledby="founder-timeline-heading"
      data-testid="founder-timeline"
      className="mt-10 border-t pt-8"
      style={{ borderColor: 'var(--paper-line)' }}
    >
      <h2 id="founder-timeline-heading" className="text-2xl font-semibold tracking-tight">
        {S['AVK-FS-FT-01']}
      </h2>
      <ol className="mt-6 flex flex-col gap-5 border-l pl-5" style={{ borderColor: 'var(--paper-line)' }}>
        {ITEMS.map((item) => (
          <li key={item.marker} className="flex flex-col gap-1 sm:flex-row sm:gap-6">
            <p className="text-sm font-semibold sm:w-36 sm:shrink-0" style={{ color: 'var(--ink)' }}>
              {item.marker}
            </p>
            <p className="text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
              {item.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
