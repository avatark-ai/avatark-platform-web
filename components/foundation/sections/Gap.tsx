import Link from 'next/link'
import { getArchitectureContent } from '@/lib/content/foundation'
import { SectionContainer } from '@/components/foundation/Container'
import { UNIFICATION_COPY as U } from '@/lib/content/unificationCopy'

// AVK-UNIFICATION-03B: "Why AvatarK exists" (evolves the former Gap teaser in place). The thesis
// statement is unchanged; the three lines that used to sit in the hero move here unchanged. Both
// still come from content/foundation/architecture.md (single source, not edited). The elaboration
// (Reactive/Fragmented/Not Longitudinal) stays on /foundation.
export function WhyAvatarK() {
  const { gapStatement, lines } = getArchitectureContent()

  return (
    <section id="gap" aria-labelledby="why-avatark-heading" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <SectionContainer className="flex flex-col items-center gap-6 text-center">
        <h2 id="why-avatark-heading" className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
          {U['AVK-U03-WY-01']}
        </h2>
        <p className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">&ldquo;{gapStatement}&rdquo;</p>
        <div className="flex flex-col gap-2 text-lg leading-8" style={{ color: 'var(--ink-dim)' }}>
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <Link
          href="/foundation"
          className="rounded-sm px-2 py-1 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--ink)', outlineColor: 'var(--focus-ring)' }}
        >
          {U['AVK-U03-WY-06']}
        </Link>
      </SectionContainer>
    </section>
  )
}
