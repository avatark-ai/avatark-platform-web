import type { Metadata } from 'next'
import Link from 'next/link'
import { FounderPageLayout } from '@/components/foundation/founder/FounderPageLayout'
import { FounderChapterHeader } from '@/components/foundation/founder/FounderChapterHeader'
import { FounderChapterNav } from '@/components/foundation/founder/FounderChapterNav'
import { FounderPullQuote } from '@/components/foundation/founder/FounderPullQuote'
import { FounderPortrait } from '@/components/foundation/founder/FounderPortrait'
import { FounderContinueJourney } from '@/components/foundation/founder/FounderContinueJourney'
import { getFounderLetter } from '@/lib/content/foundation'

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
      <FounderChapterHeader chapterId="future" title={chapter.navLabel} />
      <div className="mt-6 flex flex-col gap-5 text-lg leading-8" style={{ color: 'var(--ink)' }}>
        {chapter.paragraphs.map((paragraph, index) =>
          chapter.pullQuoteIndexes.includes(index) ? (
            <FounderPullQuote key={index}>{paragraph}</FounderPullQuote>
          ) : (
            <div key={index}>
              <p>{paragraph}</p>
              {paragraph.startsWith('From this architecture grew an ecosystem') && (
                <Link
                  href="/ecosystem"
                  className="mt-3 inline-block rounded-sm text-base font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
                >
                  Explore the Ecosystem →
                </Link>
              )}
            </div>
          ),
        )}
      </div>

      <FounderChapterNav chapterId="future" />

      <FounderPortrait name={letter.author} role={letter.role} credentials={letter.credentials} />

      <FounderContinueJourney />
    </FounderPageLayout>
  )
}
