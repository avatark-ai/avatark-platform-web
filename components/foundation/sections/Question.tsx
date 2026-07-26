import Link from 'next/link'
import { EditorialContainer } from '@/components/foundation/Container'

// Timeline reflects the Founder Letter's own account exactly (1986 arrival
// at BITS Pilani, not an earlier placeholder year) -- see
// content/foundation/founder-letter.md, the canonical source.
const TIMELINE = ['1986', 'BITS Pilani', 'Setpoint', 'USA', 'IBM', 'AI', 'AvatarK']

export function Question() {
  return (
    <section id="question" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <EditorialContainer className="text-center">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          What builds the engineer before the engineer builds the world?
        </h2>

        <ol className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-3 text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>
          {TIMELINE.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span style={{ color: 'var(--ink)' }}>{step}</span>
              {index < TIMELINE.length - 1 && (
                <span aria-hidden="true" style={{ color: 'var(--gold)' }}>
                  →
                </span>
              )}
            </li>
          ))}
        </ol>

        <Link
          href="/founder"
          className="mt-8 inline-block rounded-sm px-2 py-1 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
        >
          Read the Founder Letter
        </Link>
      </EditorialContainer>
    </section>
  )
}
