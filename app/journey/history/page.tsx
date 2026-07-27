'use client'

import Link from 'next/link'
import { useJourneySession } from '@/lib/journey/session'
import { INTENTIONS } from '@/lib/onboarding/intentions'
import { WITNESS_LABEL } from '@/lib/onboarding/witness'
import type { JourneyContext } from '@/lib/journey/state'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// Pure by design -- see TodayView's comment in ../today/page.tsx.
export function HistoryView({ context }: { context: JourneyContext }) {
  const intentionLabel = INTENTIONS.find((i) => i.id === context.intention)?.label

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--gold)' }}>
          History
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Your history</h1>
      </div>

      {context.startedAt ? (
        <>
          <div
            className="flex flex-col gap-1 rounded-md border p-5"
            style={{ borderColor: 'var(--surface-line)', background: 'var(--surface)' }}
          >
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--gold)' }}>
              {formatDate(context.startedAt)}
            </p>
            <p className="text-base" style={{ color: 'var(--paper)' }}>
              {intentionLabel ? (
                <>
                  Named what mattered: <span className="font-semibold">&ldquo;{intentionLabel}&rdquo;</span>
                </>
              ) : (
                'Began the journey.'
              )}
            </p>
            {context.witness ? (
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                Started {WITNESS_LABEL}.
              </p>
            ) : null}
          </div>
          <p className="text-sm leading-6" style={{ color: 'var(--text-dim)' }}>
            Tomorrow this page will begin telling more of your story.
          </p>
        </>
      ) : (
        <>
          <p className="text-base leading-7" style={{ color: 'var(--paper)' }}>
            You&apos;ve begun your journey.
            <br />
            Tomorrow this page will begin telling your story.
          </p>
          <Link
            href="/start"
            className="inline-block w-fit rounded-full px-8 py-3 text-center text-base font-semibold echo-cta-primary"
            style={{ background: 'var(--gold)', color: 'var(--midnight)' }}
          >
            Begin with an Echo
          </Link>
        </>
      )}
    </div>
  )
}

export default function JourneyHistoryPage() {
  const { context } = useJourneySession()
  return <HistoryView context={context} />
}
