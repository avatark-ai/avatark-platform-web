import Link from 'next/link'
import { getArchitectureContent } from '@/lib/content/foundation'
import { ENTER_ECHO_HREF } from '@/lib/content/links'

// Hero has its own compact wrapper (not the shared EditorialContainer) --
// it targets a specific ~520-580px desktop height, tighter than the
// shared section default, and Tailwind utility precedence between two
// conflicting py-* classes isn't reliably order-dependent, so an
// overriding className passed into EditorialContainer isn't safe to rely on.
export function Hero() {
  const { headline, lines } = getArchitectureContent()

  return (
    <section id="hero" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <div className="mx-auto flex w-full max-w-[var(--editorial-width)] flex-col items-center gap-7 px-6 py-14 text-center sm:py-16">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">{headline}</h1>
        <div className="h-px w-16" style={{ background: 'var(--gold)' }} aria-hidden="true" />
        <div className="flex flex-col gap-2 text-lg leading-8 sm:text-xl" style={{ color: 'var(--ink-dim)' }}>
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href={ENTER_ECHO_HREF}
            className="rounded-md px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: 'var(--ink)', color: 'var(--paper)', outlineColor: 'var(--gold)' }}
          >
            Enter Echo
          </Link>
          <a
            href="#gap"
            className="rounded-sm px-2 py-1 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
          >
            Explore the Foundation
          </a>
        </div>
      </div>
    </section>
  )
}
