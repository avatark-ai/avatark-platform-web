import type { Metadata } from 'next'
import { FounderPageLayout } from '@/components/foundation/founder/FounderPageLayout'
import { FounderChapterHeader } from '@/components/foundation/founder/FounderChapterHeader'
import { FounderChapterNav } from '@/components/foundation/founder/FounderChapterNav'
import { FounderPullQuote } from '@/components/foundation/founder/FounderPullQuote'
import { getFounderLetter } from '@/lib/content/foundation'

export const metadata: Metadata = {
  title: 'The Question — AvatarK Founder Letter',
  description: 'Enterprise software, IBM, and the missing operating system: why technology remembers transactions better than transformation.',
}

export default function FounderQuestionPage() {
  const letter = getFounderLetter()
  const chapter = letter.chapters.find((c) => c.id === 'question')

  if (!chapter) return null

  return (
    <FounderPageLayout>
      <FounderChapterHeader chapterId="question" title={chapter.navLabel} />
      <div className="mt-6 flex flex-col gap-5 text-lg leading-8" style={{ color: 'var(--ink)' }}>
        {chapter.paragraphs.map((paragraph, index) =>
          chapter.pullQuoteIndexes.includes(index) ? (
            <FounderPullQuote key={index}>{paragraph}</FounderPullQuote>
          ) : (
            <p key={index}>{paragraph}</p>
          ),
        )}
      </div>

      <FounderChapterNav chapterId="question" />
    </FounderPageLayout>
  )
}
