import type { Metadata } from 'next'
import { InstitutionalLayout } from '@/components/foundation/InstitutionalLayout'
import { SectionContainer, EditorialContainer } from '@/components/foundation/Container'
import { TransactionsVsTransformation } from '@/components/foundation/architecture/TransactionsVsTransformation'
import { FragmentedVsLongitudinal } from '@/components/foundation/architecture/FragmentedVsLongitudinal'
import { ArchitectureOfBecomingFlow } from '@/components/foundation/architecture/ArchitectureOfBecomingFlow'
import { RevealOnView, RippleLink } from '@avatark/motion'
import { getArchitectureContent } from '@/lib/content/foundation'

export const metadata: Metadata = {
  title: 'Foundation — Why AvatarK Exists',
  description: 'Why does the world need AvatarK? Technology remembers transactions. Humans remember transformation.',
}

// Original to this page, not the Four Axes (that geometry belongs to
// Canon) -- these are product-philosophy principles, each one answering
// one of the three problems below.
const PRINCIPLES = [
  {
    id: 'longitudinal',
    label: 'Longitudinal, not transactional',
    body: 'A life has an arc. Software should track the arc, not just the moment it happened to be open.',
  },
  {
    id: 'integrated',
    label: 'Integrated, not fragmented',
    body: 'Practice, community and evidence belong in one architecture, not scattered across products that never speak to each other.',
  },
  {
    id: 'practice',
    label: 'Practice, not profile',
    body: 'What matters is what a person does with what they learn — not what they display.',
  },
] as const

export default function FoundationPage() {
  const { gapStatement, gapCards } = getArchitectureContent()

  return (
    <InstitutionalLayout>
      <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <div className="mx-auto flex w-full max-w-[var(--editorial-width)] flex-col items-center gap-6 px-6 py-14 text-center sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
            Foundation
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Why does the world need AvatarK?
          </h1>
          <div className="h-px w-16" style={{ background: 'var(--gold)' }} aria-hidden="true" />
          <p className="text-lg leading-8 sm:text-xl" style={{ color: 'var(--ink-dim)' }}>
            Every operating system remembers something. Ours has never remembered how a person became who they are.
          </p>
        </div>
      </section>

      <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <SectionContainer>
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">The Problem</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg font-medium leading-8" style={{ color: 'var(--ink)' }}>
              &ldquo;{gapStatement}&rdquo;
            </p>
          </div>

          <div className="mt-10 max-w-2xl mx-auto w-full">
            <TransactionsVsTransformation />
          </div>

          <RevealOnView className="motion-emerge-stagger mt-8 grid gap-6 sm:grid-cols-3">
            {gapCards.map((card) => (
              <div
                key={card.id}
                className="rounded-lg border p-5"
                style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
              >
                <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
                  {card.label}
                </h3>
                <p className="mt-3 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
                  {card.body}
                </p>
              </div>
            ))}
          </RevealOnView>

          <div className="mt-8 max-w-3xl mx-auto w-full">
            <FragmentedVsLongitudinal />
          </div>
        </SectionContainer>
      </section>

      <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <SectionContainer>
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Core Principles</h2>
          <RevealOnView className="motion-emerge-stagger mt-8 grid gap-6 sm:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <div key={principle.id}>
                <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
                  {principle.label}
                </h3>
                <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
                  {principle.body}
                </p>
              </div>
            ))}
          </RevealOnView>
        </SectionContainer>
      </section>

      <section>
        <EditorialContainer className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Why AvatarK Exists</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8" style={{ color: 'var(--ink-dim)' }}>
            AvatarK exists to give technology a way to remember what a life became, not only what it did — and to
            make that memory useful to the next person who needs it. An operating system for becoming, one
            practice at a time.
          </p>

          <div className="mt-8">
            <ArchitectureOfBecomingFlow />
          </div>

          <RippleLink
            href="/canon"
            className="mt-8 inline-block rounded-md px-6 py-3 text-sm font-semibold transition hover:opacity-90 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: 'var(--ink)', color: 'var(--paper)', outlineColor: 'var(--gold)' }}
          >
            Continue to Canon →
          </RippleLink>
        </EditorialContainer>
      </section>
    </InstitutionalLayout>
  )
}
