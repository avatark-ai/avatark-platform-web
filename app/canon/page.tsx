import type { Metadata } from 'next'
import Link from 'next/link'
import { EditorialContainer } from '@/components/foundation/Container'
import { Canon } from '@/components/foundation/sections/Canon'
import { LivingSpiral } from '@/components/foundation/sections/LivingSpiral'
import { CanonPageLayout } from '@/components/foundation/canon/CanonPageLayout'
import { CanonGateway } from '@/components/foundation/canon/CanonGateway'
import { getCanonContent } from '@/lib/content/foundation'

export const metadata: Metadata = {
  title: 'The Canon — AvatarK Architecture',
  description: 'The geometry underneath AvatarK: the Four Axes and the Living Spiral, with room for what comes next.',
}

export default function CanonPage() {
  const canonContent = getCanonContent()

  return (
    <CanonPageLayout
      afterContent={
        <section style={{ background: 'var(--midnight)', color: 'var(--paper)' }}>
          <EditorialContainer className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">The architecture becomes many experiences.</h2>
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
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
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
      <LivingSpiral />
      <CanonGateway />
    </CanonPageLayout>
  )
}
