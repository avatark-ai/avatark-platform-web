import type { Metadata } from 'next'
import Link from 'next/link'
import { FounderPageLayout } from '@/components/foundation/founder/FounderPageLayout'
import { getFounderLetter } from '@/lib/content/foundation'
import { ENTER_ECHO_HREF } from '@/lib/content/links'

export const metadata: Metadata = {
  title: 'The Future — AvatarK Founder Letter',
  description: 'Why AvatarK exists: an institution rather than a startup, an open ecosystem of practices and Echoes, built for generations.',
}

export default function FounderFuturePage() {
  const letter = getFounderLetter()
  const chapter = letter.chapters.find((c) => c.id === 'future')

  if (!chapter) return null

  return (
    <FounderPageLayout>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
        {chapter.navLabel}
      </p>
      <div className="mt-6 flex flex-col gap-5 text-lg leading-8" style={{ color: 'var(--ink)' }}>
        {chapter.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-8 border-t pt-8" style={{ borderColor: 'var(--paper-line)' }}>
        <p className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
          {letter.author}
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-dim)' }}>
          {letter.role}
        </p>
        <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>
          {letter.credentials}
        </p>
      </div>

      <div className="mt-8 text-center">
        <Link
          href={ENTER_ECHO_HREF}
          className="inline-block rounded-md px-8 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: 'var(--ink)', color: 'var(--paper)', outlineColor: 'var(--gold)' }}
        >
          Enter Echo
        </Link>
      </div>
    </FounderPageLayout>
  )
}
