import type { Metadata } from 'next'
import { FounderPageLayout } from '@/components/foundation/founder/FounderPageLayout'
import { getFounderLetter } from '@/lib/content/foundation'

export const metadata: Metadata = {
  title: 'From Possibility to Reality — A Letter from AvatarK’s Founder',
  description: 'Devendar Pallapati, Founder of AvatarK, on the question behind the architecture.',
}

export default function FounderPage() {
  const letter = getFounderLetter()

  return (
    <FounderPageLayout>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
        Founder Letter
      </p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{letter.title}</h1>
      <div className="mt-6 flex flex-col gap-5 text-lg leading-8" style={{ color: 'var(--ink)' }}>
        {letter.opening.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </FounderPageLayout>
  )
}
