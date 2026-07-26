import type { Metadata } from 'next'
import Link from 'next/link'
import { InstitutionalLayout } from '@/components/foundation/InstitutionalLayout'
import { SectionContainer, EditorialContainer } from '@/components/foundation/Container'
import { Canon } from '@/components/foundation/sections/Canon'
import { LivingSpiral } from '@/components/foundation/sections/LivingSpiral'
import { CanonPageNav } from '@/components/foundation/canon/CanonPageNav'
import { CanonGateway } from '@/components/foundation/canon/CanonGateway'
import { CANON_NAV_ITEMS, CANON_FUTURE_ITEMS } from '@/lib/content/canonNav'
import { getCanonContent } from '@/lib/content/foundation'

export const metadata: Metadata = {
  title: 'The Canon — AvatarK Architecture',
  description: 'The geometry underneath AvatarK: the Four Axes and the Living Spiral, with room for what comes next.',
}

export default function CanonPage() {
  const canonContent = getCanonContent()

  return (
    <InstitutionalLayout>
      <article>
        <SectionContainer>
          {/* Canon navigation and the Canon introduction share the first
              row so the local nav reads as primary, not secondary -- the
              left rail starts at the top of the page content, not below a
              masthead. */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr] lg:gap-16">
            <CanonPageNav items={CANON_NAV_ITEMS} />

            <div className="flex flex-col gap-14">
              <div>
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

              <Canon content={canonContent} />
              <LivingSpiral />
              <CanonGateway />
            </div>
          </div>
        </SectionContainer>

        <section className="border-t" style={{ borderColor: 'var(--paper-line)' }}>
          <SectionContainer>
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">More in the Canon</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
              The Canon grows as an architecture, not a launch. These chapters are reserved, not yet written.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {CANON_FUTURE_ITEMS.map((section) => (
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
