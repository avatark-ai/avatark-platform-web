import type { Metadata } from 'next'
import Link from 'next/link'
import { EditorialContainer } from '@/components/foundation/Container'
import { Canon } from '@/components/foundation/sections/Canon'
import { LivingSpiral } from '@/components/foundation/sections/LivingSpiral'
import { CanonPageLayout } from '@/components/foundation/canon/CanonPageLayout'
import { CanonGateway } from '@/components/foundation/canon/CanonGateway'
import { CanonContemporaryReading } from '@/components/foundation/canon/CanonContemporaryReading'
import { getCanonContent } from '@/lib/content/foundation'
import { LIVING_WORLDS_COPY as L } from '@/lib/content/livingWorldsCopy'

export const metadata: Metadata = {
  title: 'The Canon — AvatarK Architecture',
  description: 'The geometry underneath AvatarK: the Four Axes and the Living Spiral, with room for what comes next.',
}

export default function CanonPage() {
  const canonContent = getCanonContent()

  return (
    <CanonPageLayout
      afterContent={
        <section className="avk-dark-surface" style={{ background: 'var(--midnight)', color: 'var(--paper)' }}>
          <EditorialContainer className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">The architecture becomes many experiences.</h2>
            {/* AVK-FOUNDER-LIVING-WORLDS-02 (AVK-FLW-CN-01): Platform framing, not ported Canon text. */}
            <p className="mx-auto mt-4 max-w-xl text-base leading-7" style={{ color: 'var(--paper)' }}>
              {L['AVK-FLW-CN-01']}
            </p>
            <Link
              href="/ecosystem"
              className="mt-6 inline-block rounded-md px-6 py-3 text-sm font-semibold transition hover:opacity-90 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: 'var(--gold)', color: 'var(--midnight)', outlineColor: 'var(--paper)' }}
            >
              Continue to the Ecosystem →
            </Link>
          </EditorialContainer>
        </section>
      }
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold-ink)' }}>
          Canon
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{canonContent.title}</h1>
        {canonContent.intro.map((paragraph) => (
          <p key={paragraph} className="mt-5 text-lg leading-8" style={{ color: 'var(--ink-dim)' }}>
            {paragraph}
          </p>
        ))}
      </div>

      <Canon content={canonContent} />
      {/* AVK-FOUNDER-SCIENCE-02 (AVK-FS-CI-*): directly after AVK-FLW-CN-02, before the Living Spiral. */}
      <CanonContemporaryReading content={canonContent} />
      <LivingSpiral />
      <CanonGateway />
    </CanonPageLayout>
  )
}
