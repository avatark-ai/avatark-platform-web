import Link from 'next/link'
import { getArchitectureContent } from '@/lib/content/foundation'
import { SectionContainer } from '@/components/foundation/Container'

// The Home teaser for the gap -- just the thesis statement. The
// elaboration (Reactive/Fragmented/Not Longitudinal) is Foundation's to
// tell now (app/foundation/page.tsx), not repeated here.
export function Gap() {
  const { gapStatement } = getArchitectureContent()

  return (
    <section id="gap" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <SectionContainer className="flex flex-col items-center gap-6 text-center">
        <p className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">&ldquo;{gapStatement}&rdquo;</p>
        <Link
          href="/foundation"
          className="rounded-sm px-2 py-1 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
        >
          Learn More →
        </Link>
      </SectionContainer>
    </section>
  )
}
