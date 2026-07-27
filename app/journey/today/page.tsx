'use client'

import { Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useJourneySession } from '@/lib/journey/session'
import { WITNESS_LABEL, PRACTICE_LABEL } from '@/lib/onboarding/witness'
import { PROMETHEUSK_DISPLAY_NAME } from '@/lib/onboarding/prometheusk'
import { getContinuityAction, getIntentionLabel } from '@/lib/journey/continuity'
import type { JourneyContext } from '@/lib/journey/state'

const ctaStyle = {
  background: 'var(--gold)',
  color: 'var(--midnight)',
} as const

// Pure by design -- every branch is fully determined by its props, so
// it can be rendered with fixture data with no Supabase session at all.
export function TodayView({
  context,
  displayName,
}: {
  context: JourneyContext
  displayName: string | null
}) {
  const intentionLabel = getIntentionLabel(context)
  const greeting = displayName ? `Welcome back, ${displayName}.` : 'Welcome back.'
  const recommendation = getContinuityAction(context)
  const hasSnapshot = Boolean(intentionLabel || context.witness)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--gold)' }}>
          Today
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">{greeting}</h1>
      </div>

      {hasSnapshot ? (
        <div
          className="flex flex-col gap-4 rounded-md border p-5"
          style={{ borderColor: 'var(--surface-line)', background: 'var(--surface)' }}
        >
          {intentionLabel ? (
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
                Current intention
              </p>
              <p className="text-base" style={{ color: 'var(--paper)' }}>
                {intentionLabel}
              </p>
            </div>
          ) : null}
          {context.witness ? (
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
                Current practice
              </p>
              <p className="text-base" style={{ color: 'var(--paper)' }}>
                {PRACTICE_LABEL}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                from {WITNESS_LABEL}, on {PROMETHEUSK_DISPLAY_NAME}
              </p>
            </div>
          ) : null}
          {context.practiceCompletedAt ? (
            <p className="text-sm" style={{ color: 'var(--gold)' }}>
              ✓ Completion verified by {PROMETHEUSK_DISPLAY_NAME}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
          Recommended next step
        </p>
        <p className="text-base leading-7" style={{ color: 'var(--paper)' }}>
          {recommendation.body}
        </p>
        {recommendation.external ? (
          <a
            href={recommendation.href}
            className="mt-1 inline-block w-fit rounded-full px-8 py-3 text-center text-base font-semibold echo-cta-primary"
            style={ctaStyle}
          >
            {recommendation.ctaLabel}
          </a>
        ) : (
          <Link
            href={recommendation.href}
            className="mt-1 inline-block w-fit rounded-full px-8 py-3 text-center text-base font-semibold echo-cta-primary"
            style={ctaStyle}
          >
            {recommendation.ctaLabel}
          </Link>
        )}
      </div>
    </div>
  )
}

function TodayContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const intentionParam = searchParams.get('intention')
  const witnessParam = searchParams.get('witness')
  const { principal, context, displayName, absorbIntentionParams } = useJourneySession()

  // Absorb query params carried in from the onboarding chain into the
  // canonical (user_metadata-backed) context, then drop them from the
  // URL -- a returning visit to this exact page should look identical
  // whether or not it just arrived with params.
  useEffect(() => {
    if (principal.status !== 'signed_in') return
    if (!intentionParam && !witnessParam) return
    absorbIntentionParams({ intention: intentionParam, witness: witnessParam }).then(() => {
      router.replace('/journey/today')
    })
  }, [principal.status, intentionParam, witnessParam, absorbIntentionParams, router])

  return <TodayView context={context} displayName={displayName} />
}

export default function JourneyTodayPage() {
  return (
    <Suspense fallback={<p className="text-sm" style={{ color: 'var(--text-dim)' }}>Loading…</p>}>
      <TodayContent />
    </Suspense>
  )
}
