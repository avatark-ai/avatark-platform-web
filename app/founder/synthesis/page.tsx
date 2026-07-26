import type { Metadata } from 'next'
import { FounderPageLayout } from '@/components/foundation/founder/FounderPageLayout'
import { FounderChapterHeader } from '@/components/foundation/founder/FounderChapterHeader'
import { FounderChapterNav } from '@/components/foundation/founder/FounderChapterNav'
import { FounderGeometry } from '@/components/foundation/founder/FounderGeometry'
import { FounderPullQuote } from '@/components/foundation/founder/FounderPullQuote'
import { getFounderLetter } from '@/lib/content/foundation'

export const metadata: Metadata = {
  title: 'The Synthesis — AvatarK Founder Letter',
  description: 'How the answer emerged: Indian philosophy, the three inner axes, Prometheus, and the geometry behind the AvatarK architecture.',
}

export default function FounderSynthesisPage() {
  const letter = getFounderLetter()
  const chapter = letter.chapters.find((c) => c.id === 'synthesis')

  if (!chapter) return null

  return (
    <FounderPageLayout>
      <FounderChapterHeader chapterId="synthesis" title={chapter.navLabel} />
      <div className="mt-6 flex flex-col gap-5 text-lg leading-8" style={{ color: 'var(--ink)' }}>
        {chapter.paragraphs.map((paragraph, index) =>
          chapter.pullQuoteIndexes.includes(index) ? (
            <FounderPullQuote key={index}>{paragraph}</FounderPullQuote>
          ) : (
            <p key={index}>{paragraph}</p>
          ),
        )}
      </div>
      <FounderGeometry />

      <FounderChapterNav chapterId="synthesis" />
    </FounderPageLayout>
  )
}
