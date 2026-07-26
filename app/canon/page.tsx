import type { Metadata } from 'next'
import Link from 'next/link'
import { InstitutionalLayout } from '@/components/foundation/InstitutionalLayout'
import { SectionContainer, EditorialContainer } from '@/components/foundation/Container'
import { Canon } from '@/components/foundation/sections/Canon'
import { LivingSpiral } from '@/components/foundation/sections/LivingSpiral'
import { getCanonContent } from '@/lib/content/foundation'

export const metadata: Metadata = {
  title: 'The Canon — AvatarK Architecture',
  description: 'The geometry underneath AvatarK: the Four Axes and the Living Spiral, with room for what comes next.',
}

const AVAILABLE_SECTIONS = [
  { id: 'four-axes', label: 'Four Axes' },
  { id: 'living-spiral', label: 'Living Spiral' },
] as const

// Structure, not content -- these are placeholders so future Canon
// chapters have somewhere to land without another information-architecture
// pass. Deliberately not routes and not linked; each is plain text with a
// "Soon" marker until it has real content.
const COMING_SOON_SECTIONS = [
  { id: 'sacred-geometry', label: 'Sacred Geometry' },
  { id: 'archetypes', label: 'Archetypes' },
  { id: 'practices', label: 'Practices' },
  { id: 'memory', label: 'Memory' },
  { id: 'living-echo', label: 'Living Echo' },
  { id: 'human-development', label: 'Human Development' },
  { id: 'geometry-of-becoming', label: 'Geometry of Becoming' },
] as const

export default function CanonPage() {
  const canonContent = getCanonContent()

  return (
    <InstitutionalLayout>
      <article>
        <SectionContainer>
          <div className="max-w-[var(--editorial-width)]">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
              Canon
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {canonContent.title}
            </h1>
            {canonContent.intro.map((paragraph) => (
              <p key={paragraph} className="mt-5 text-lg leading-8" style={{ color: 'var(--ink-dim)' }}>
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr] lg:gap-12">
            <nav
              aria-label="Canon sections"
              className="flex flex-row flex-nowrap gap-x-5 overflow-x-auto border-b pb-4 lg:sticky lg:top-24 lg:flex-col lg:items-start lg:gap-y-3 lg:self-start lg:overflow-visible lg:border-b-0 lg:pb-0"
              style={{ borderColor: 'var(--paper-line)' }}
            >
              {AVAILABLE_SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="shrink-0 rounded-sm text-sm font-medium transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: 'var(--ink-dim)', outlineColor: 'var(--gold)' }}
                >
                  {section.label}
                </a>
              ))}
              {COMING_SOON_SECTIONS.map((section) => (
                <span key={section.id} className="flex shrink-0 items-center gap-1.5 text-sm" style={{ color: 'var(--ink-dim)', opacity: 0.5 }}>
                  {section.label}
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Soon</span>
                </span>
              ))}
            </nav>

            <div className="flex flex-col gap-14">
              <Canon content={canonContent} />
              <LivingSpiral />
            </div>
          </div>
        </SectionContainer>

        <section className="border-t" style={{ borderColor: 'var(--paper-line)' }}>
          <SectionContainer>
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">More in the Canon</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
              The Canon grows as an architecture, not a launch. These chapters are reserved, not yet written.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {COMING_SOON_SECTIONS.map((section) => (
                <div
                  key={section.id}
                  className="rounded-lg border p-4 text-center"
                  style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)', opacity: 0.6 }}
                >
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {section.label}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
                    Soon
                  </p>
                </div>
              ))}
            </div>
          </SectionContainer>
        </section>

        <section style={{ background: 'var(--midnight)', color: 'var(--paper)' }}>
          <EditorialContainer className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">The architecture becomes many experiences.</h2>
            <Link
              href="/ecosystem"
              className="mt-6 inline-block rounded-md px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: 'var(--gold)', color: 'var(--midnight)', outlineColor: 'var(--paper)' }}
            >
              Continue to the Ecosystem →
            </Link>
          </EditorialContainer>
        </section>
      </article>
    </InstitutionalLayout>
  )
}
