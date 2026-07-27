import type { Metadata } from 'next'
import Link from 'next/link'
import { InstitutionalLayout } from '@/components/foundation/InstitutionalLayout'
import { EditorialContainer } from '@/components/foundation/Container'
import { PlatformArchitecture } from '@/components/ecosystem/PlatformArchitecture'

export const metadata: Metadata = {
  title: 'The AvatarK Ecosystem',
  description: 'One platform. Multiple ways to grow. One continuous journey.',
}

// The platform architecture, presented: AvatarK -> Echo -> three equal
// Growth Engines (PrometheusK/GameK/Atlas) -> the Expression Layer
// (ArenaK -> StreamK -> CinemaK). Presentation only -- content lives in
// PlatformArchitecture and its components/ecosystem/* children; this page
// only supplies the masthead and the closing Founder continuity link,
// matching the rest of the institutional site's per-page structure.
export default function EcosystemPage() {
  return (
    <InstitutionalLayout>
      <section className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
        <div className="mx-auto flex w-full max-w-[var(--editorial-width)] flex-col items-center gap-5 px-6 py-10 text-center sm:py-12">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            The AvatarK Ecosystem
          </h1>
          <div className="h-px w-16" style={{ background: 'var(--gold)' }} aria-hidden="true" />
          <div className="flex flex-col gap-1 text-lg leading-8 sm:text-xl" style={{ color: 'var(--ink-dim)' }}>
            <p>One platform.</p>
            <p>Multiple ways to grow.</p>
            <p>One continuous journey.</p>
          </div>
        </div>
      </section>

      <PlatformArchitecture />

      <section className="border-t" style={{ background: 'var(--midnight)', color: 'var(--paper)' }}>
        <EditorialContainer className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Every product traces back to one person.</h2>
          <Link
            href="/founder"
            className="mt-6 inline-block rounded-md px-6 py-3 text-sm font-semibold transition hover:opacity-90 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: 'var(--gold)', color: 'var(--midnight)', outlineColor: 'var(--paper)' }}
          >
            Continue to the Founder →
          </Link>
        </EditorialContainer>
      </section>
    </InstitutionalLayout>
  )
}
