import Link from 'next/link'
import { getArchitectureContent } from '@/lib/content/foundation'
import { ENTER_ECHO_HREF } from '@/lib/content/links'

export function Hero() {
  const { headline, lines } = getArchitectureContent()

  return (
    <section id="hero" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 py-24 text-center sm:py-32">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">{headline}</h1>
        <div className="h-px w-16" style={{ background: 'var(--gold)' }} aria-hidden="true" />
        <div className="flex flex-col gap-2 text-lg leading-8 sm:text-xl" style={{ color: 'var(--ink-dim)' }}>
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
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
