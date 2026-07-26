import Link from 'next/link'
import { getAdjacentFounderChapters } from '@/components/foundation/founder/founderChapters'

// Closes out every chapter's reading content -- previously only /founder
// had a "continue" link (next-only, styled as plain underlined text); the
// middle two chapters were dead ends you could only leave via the rail.
// Same left/right prev-next pattern as CanonSacredGeometryPlatePage, for
// consistency across the two reader experiences.
export function FounderChapterNav({ chapterId }: { chapterId: string }) {
  const { previous, next } = getAdjacentFounderChapters(chapterId)
  if (!previous && !next) return null

  return (
    <nav
      aria-label="Founder chapter navigation"
      className="mt-4 flex items-center justify-between border-t pt-6"
      style={{ borderColor: 'var(--paper-line)' }}
    >
      {previous ? (
        <Link
          href={previous.href}
          className="flex flex-col rounded-sm text-sm hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--ink-dim)', outlineColor: 'var(--gold)' }}
        >
          <span aria-hidden="true">← Previous</span>
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
          className="flex flex-col rounded-sm text-right text-sm hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--ink-dim)', outlineColor: 'var(--gold)' }}
        >
          <span aria-hidden="true">Next →</span>
          <span className="font-semibold" style={{ color: 'var(--ink)' }}>
            {next.label}
          </span>
        </Link>
      )}
    </nav>
  )
}
