import type { Metadata } from 'next'
import Link from 'next/link'
import { InstitutionalLayout } from '@/components/foundation/InstitutionalLayout'
import { EditorialContainer } from '@/components/foundation/Container'
import { getFounderLetter } from '@/lib/content/foundation'
import { ENTER_ECHO_HREF } from '@/lib/content/links'

export const metadata: Metadata = {
  title: 'From Possibility to Reality — A Letter from AvatarK’s Founder',
  description: 'Devendar Pallapati, Founder of AvatarK, on the question behind the architecture.',
}

export default function FounderPage() {
  const letter = getFounderLetter()

  return (
    <InstitutionalLayout>
      <article>
        <EditorialContainer>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{letter.title}</h1>

          <div className="mt-16 flex flex-col gap-6 text-lg leading-8" style={{ color: 'var(--ink)' }}>
            {letter.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-16 border-t pt-8" style={{ borderColor: 'var(--paper-line)' }}>
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

          <div className="mt-16 text-center">
            <Link
              href={ENTER_ECHO_HREF}
              className="inline-block rounded-md px-8 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: 'var(--ink)', color: 'var(--paper)', outlineColor: 'var(--gold)' }}
            >
              Enter Echo
            </Link>
          </div>
        </EditorialContainer>
      </article>
    </InstitutionalLayout>
  )
}
