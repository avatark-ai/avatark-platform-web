import type { Metadata } from 'next'
import Link from 'next/link'
import { InstitutionalLayout } from '@/components/foundation/InstitutionalLayout'
import { SectionContainer } from '@/components/foundation/Container'
import { FounderChapterNav } from '@/components/foundation/founder/FounderChapterNav'
import { FounderGeometry } from '@/components/foundation/founder/FounderGeometry'
import { FounderPullQuote } from '@/components/foundation/founder/FounderPullQuote'
import { getFounderLetter } from '@/lib/content/foundation'
import { ENTER_ECHO_HREF } from '@/lib/content/links'

export const metadata: Metadata = {
  title: 'From Possibility to Reality — A Letter from AvatarK’s Founder',
  description: 'Devendar Pallapati, Founder of AvatarK, on the question behind the architecture.',
}

export default function FounderPage() {
  const letter = getFounderLetter()

  const navItems = [{ id: 'introduction', label: 'Introduction' }, ...letter.chapters.map((chapter) => ({
    id: chapter.id,
    label: chapter.navLabel,
  }))]

  return (
    <InstitutionalLayout>
      <article>
        <SectionContainer>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[180px_1fr] lg:gap-12">
            <FounderChapterNav items={navItems} />

            <div className="max-w-[var(--editorial-width)]">
              <section id="introduction" className="scroll-mt-24">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
                  Founder Letter
                </p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                  {letter.title}
                </h1>
                <div className="mt-6 flex flex-col gap-5 text-lg leading-8" style={{ color: 'var(--ink)' }}>
                  {letter.opening.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </section>

              {letter.chapters.map((chapter) => (
                <section
                  key={chapter.id}
                  id={chapter.id}
                  className="mt-8 scroll-mt-24 border-t pt-8"
                  style={{ borderColor: 'var(--paper-line)' }}
                >
                  <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
                    {chapter.navLabel}
                  </h2>
                  <div className="mt-6 flex flex-col gap-5 text-lg leading-8" style={{ color: 'var(--ink)' }}>
                    {chapter.paragraphs.map((paragraph, index) =>
                      chapter.pullQuoteIndexes.includes(index) ? (
                        <FounderPullQuote key={index}>{paragraph}</FounderPullQuote>
                      ) : (
                        <p key={index}>{paragraph}</p>
                      ),
                    )}
                  </div>
                  {chapter.id === 'synthesis' && <FounderGeometry />}
                </section>
              ))}

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
            </div>
          </div>
        </SectionContainer>
      </article>
    </InstitutionalLayout>
  )
}
