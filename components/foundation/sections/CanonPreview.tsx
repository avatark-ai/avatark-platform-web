import Link from 'next/link'
import type { CanonContent } from '@/lib/content/foundation'
import { SectionContainer } from '@/components/foundation/Container'

// Home's teaser for the Canon, not the Canon itself -- the full tabs/
// accordion experience and its own intro paragraph now live only on
// /canon (see components/foundation/sections/Canon.tsx). This shows just
// the four axis names, in a sentence distinct from canon.md's own intro,
// so the same paragraph doesn't appear on both pages.
export function CanonPreview({ content }: { content: CanonContent }) {
  return (
    <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <SectionContainer className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">The Canon</h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
          Four axes underlie everything AvatarK builds — three of inner development, and one that turns what&rsquo;s
          learned into something given to others.
        </p>

        <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {content.axes.map((axis) => (
            <li key={axis.id} className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
              {axis.label}{' '}
              <span className="font-normal" style={{ color: 'var(--ink-dim)' }}>
                {axis.figure}
              </span>
            </li>
          ))}
        </ul>

        <Link
          href="/canon"
          className="mt-8 inline-block rounded-sm px-2 py-1 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
        >
          Learn More →
        </Link>
      </SectionContainer>
    </section>
  )
}
