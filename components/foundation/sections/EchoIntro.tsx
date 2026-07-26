import Link from 'next/link'
import { ENTER_ECHO_HREF } from '@/lib/content/links'
import { EditorialContainer } from '@/components/foundation/Container'

// Midnight background -- the mission-statement beat of the homepage,
// breaking up what would otherwise be a run of consecutive Paper sections
// (Hero, Gap immediately precede it). Text tokens flip the same way
// FinalCta already does it: --ink/--ink-dim -> --paper/--text-dim.
export function EchoIntro() {
  return (
    <section id="echo" style={{ background: 'var(--midnight)', color: 'var(--paper)' }}>
      <EditorialContainer className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Every life leaves an Echo</h2>

        <ul className="mt-6 flex flex-col gap-2 text-lg" style={{ color: 'var(--text-dim)' }}>
          <li>Not another profile.</li>
          <li>Not another social network.</li>
          <li>Not another résumé.</li>
        </ul>

        <p className="mt-6 text-xl font-medium leading-8" style={{ color: 'var(--paper)' }}>
          A person&rsquo;s wisdom becoming useful to another life.
        </p>

        <p className="mx-auto mt-6 max-w-xl text-base leading-7" style={{ color: 'var(--text-dim)' }}>
          Not merely a record of what happened — what remains useful after the moment has passed: a practice, a
          warning, a way of seeing, a decision, a story or a truth that another person can test in their own life.
        </p>

        <Link
          href={ENTER_ECHO_HREF}
          className="mt-6 inline-block rounded-md px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: 'var(--gold)', color: 'var(--midnight)', outlineColor: 'var(--paper)' }}
        >
          Begin with Echo
        </Link>
      </EditorialContainer>
    </section>
  )
}
