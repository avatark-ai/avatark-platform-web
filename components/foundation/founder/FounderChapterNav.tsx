import Link from 'next/link'
import { getAdjacentFounderChapters } from '@/components/foundation/founder/founderChapters'

// Closes out every chapter's reading content -- previously only /founder
// had a "continue" link (next-only, styled as plain underlined text); the
// middle two chapters were dead ends you could only leave via the rail.
// Same left/right prev-next pattern as CanonSacredGeometryPlatePage, for
// consistency across the two reader experiences.
//
// Motion: a restrained directional micro-interaction -- the arrow glyph
// nudges a couple of pixels further in the direction it points, on
// hover/focus, so "previous" and "next" read as spatial, not just two
// identical links. No page-level slide/transition between chapters --
// these stay real route navigations.
export function FounderChapterNav({ chapterId }: { chapterId: string }) {
  const { previous, next } = getAdjacentFounderChapters(chapterId)
  if (!previous && !next) return null

  return (
    <nav
      aria-label="Founder chapter navigation"
      className="mt-10 flex items-center justify-between border-t pt-8"
      style={{ borderColor: 'var(--paper-line)' }}
    >
      {previous ? (
        <Link
          href={previous.href}
          className="group flex flex-col rounded-sm text-sm transition-colors duration-200 hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--ink-dim)', outlineColor: 'var(--gold)' }}
        >
          <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:-translate-x-1 group-focus-visible:-translate-x-1">
            ← Previous
          </span>
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>
            {previous.label}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          href={next.href}
          className="group flex flex-col rounded-sm text-right text-sm transition-colors duration-200 hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--ink-dim)', outlineColor: 'var(--gold)' }}
        >
          <span aria-hidden="true" className="inline-block transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1">
            Next →
          </span>
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>
            {next.label}
          </span>
        </Link>
      )}
    </nav>
  )
}
