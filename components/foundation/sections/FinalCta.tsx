import Link from 'next/link'
import { ENTER_ECHO_HREF } from '@/lib/content/links'
import { EditorialContainer } from '@/components/foundation/Container'

export function FinalCta() {
  return (
    <section id="final-cta" style={{ background: 'var(--midnight)', color: 'var(--paper)' }}>
      <EditorialContainer className="flex flex-col items-center gap-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          You have seen the architecture. Now experience it.
        </h2>
        <div className="flex flex-col gap-1 text-lg" style={{ color: 'var(--text-dim)' }}>
          <p>Learn from a life.</p>
          <p>Practice what works.</p>
          <p>Begin building your own Echo.</p>
        </div>
        <Link
          href={ENTER_ECHO_HREF}
          className="mt-4 inline-block rounded-md px-8 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: 'var(--gold)', color: 'var(--midnight)', outlineColor: 'var(--paper)' }}
        >
          Enter Echo →
        </Link>
      </EditorialContainer>
    </section>
  )
}
