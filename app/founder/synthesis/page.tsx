import type { Metadata } from 'next'
import { Fragment } from 'react'
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
        {chapter.paragraphs.map((paragraph, index) => (
          <Fragment key={index}>
            {chapter.subheadings
              .filter((subheading) => subheading.beforeParagraph === index)
              .map((subheading) => (
                // AVK-FOUNDER-SCIENCE-02 (AVK-FS-FL-311): in-chapter sub-heading,
                // same treatment as /founder/future's "Why Living Worlds?".
                <h2
                  key={subheading.id}
                  id={subheading.id}
                  className="mt-6 scroll-mt-6 text-2xl font-semibold tracking-tight"
                  style={{ color: 'var(--ink)' }}
                >
                  {subheading.text}
                </h2>
              ))}
            {chapter.pullQuoteIndexes.includes(index) ? (
              <FounderPullQuote>{paragraph}</FounderPullQuote>
            ) : (
              <p>{paragraph}</p>
            )}
          </Fragment>
        ))}
      </div>
      <FounderGeometry />

      <FounderChapterNav chapterId="synthesis" />
    </FounderPageLayout>
  )
}
