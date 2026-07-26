import type { Metadata } from 'next'
import { FounderPageLayout } from '@/components/foundation/founder/FounderPageLayout'
import { FounderChapterHeader } from '@/components/foundation/founder/FounderChapterHeader'
import { FounderChapterNav } from '@/components/foundation/founder/FounderChapterNav'
import { getFounderLetter } from '@/lib/content/foundation'

export const metadata: Metadata = {
  title: 'From Possibility to Reality — A Letter from AvatarK’s Founder',
  description: 'Devendar Pallapati, Founder of AvatarK, on the question behind the architecture.',
}

export default function FounderPage() {
  const letter = getFounderLetter()

  return (
    <FounderPageLayout>
      <FounderChapterHeader chapterId="introduction" title={letter.title} />
      <div className="mt-6 flex flex-col gap-5 text-lg leading-8" style={{ color: 'var(--ink)' }}>
        {letter.opening.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <FounderChapterNav chapterId="introduction" />
    </FounderPageLayout>
  )
}
