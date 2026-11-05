import Link from 'next/link'
import type { CanonContent } from '@/lib/content/foundation'
import { FOUNDER_SCIENCE_COPY as S } from '@/lib/content/founderScienceCopy'

// AVK-FOUNDER-SCIENCE-02 (AVK-FS-CI-*): AvatarK's contemporary interpretive reading
// of the Four Axes, rendered directly after the Canon section (i.e. after
// AVK-FLW-CN-02) and before the Living Spiral. A separate server component so
// the Canon section itself (components/foundation/sections/Canon.tsx) and
// content/foundation/canon.md stay untouched: axis definitions are unchanged and
// the reading labels come from canon.md's own axis headings.
//
// Heading level: rendered as h2 (not the register's suggested h3) because the
// /canon page has no h2 between its h1 and this block; an h3 would skip a level.
const READINGS: Record<string, string> = {
  Awareness: S['AVK-FS-CI-11'],
  Wisdom: S['AVK-FS-CI-21'],
  Responsibility: S['AVK-FS-CI-31'],
  Creation: S['AVK-FS-CI-41'],
}

export function CanonContemporaryReading({ content }: { content: CanonContent }) {
  return (
    <section aria-labelledby="canon-contemporary-reading-heading" data-testid="canon-contemporary-reading">
      <div className="mx-auto w-full max-w-[var(--content-width)] px-6 pb-12 sm:px-8 sm:pb-14">
        <div className="mx-auto max-w-2xl border-t pt-8" style={{ borderColor: 'var(--paper-line)' }}>
          <h2 id="canon-contemporary-reading-heading" className="text-xl font-semibold tracking-tight">
            {S['AVK-FS-CI-01']}
          </h2>
          <p className="mt-3 text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
            {S['AVK-FS-CI-02']}
          </p>
          <dl className="mt-6 flex flex-col gap-4">
            {content.axes.map((axis) => (
              <div key={axis.id}>
                <dt className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  {axis.label}
                </dt>
                <dd className="mt-1 text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
                  {READINGS[axis.label]}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
            {S['AVK-FS-CI-50-R']}
          </p>
          <p className="mt-4">
            <Link
              href="/foundation#method"
              className="inline-block rounded-sm text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
            >
              {S['AVK-FS-CI-51']}
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
