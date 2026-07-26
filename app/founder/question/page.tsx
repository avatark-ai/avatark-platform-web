import type { Metadata } from 'next'
import { FounderPageLayout } from '@/components/foundation/founder/FounderPageLayout'
import { FounderGeometry } from '@/components/foundation/founder/FounderGeometry'
import { FounderPullQuote } from '@/components/foundation/founder/FounderPullQuote'
import { getFounderLetter } from '@/lib/content/foundation'

export const metadata: Metadata = {
  title: 'The Question — AvatarK Founder Letter',
  description: 'How the four axes emerged, and how enterprise software, Indian philosophy, Prometheus, and AI complete the picture.',
}

export default function FounderQuestionPage() {
  const letter = getFounderLetter()
  const chapter = letter.chapters.find((c) => c.id === 'question')

  if (!chapter) return null

  return (
    <FounderPageLayout>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
        {chapter.navLabel}
      </p>
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
    </FounderPageLayout>
  )
}
