'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { resolveClientPrincipal, type ClientPrincipalResult } from '@/lib/auth/resolveClientPrincipal'
import { INTENTIONS, isIntentionId } from '@/lib/onboarding/intentions'

const WITNESS_SLUG = 'the-promise-to-myself'
const WITNESS_LABEL = 'The Promise to Myself'

function buildJourneyPath(intention: string | null, witness: string | null): string {
  const params = new URLSearchParams()
  if (intention) params.set('intention', intention)
  if (witness) params.set('witness', witness)
  const query = params.toString()
  return query ? `/journey?${query}` : '/journey'
}

function JourneyGate() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const intentionParam = searchParams.get('intention')
  const witness = searchParams.get('witness')
  const intention = isIntentionId(intentionParam)
    ? INTENTIONS.find((i) => i.id === intentionParam)
    : null

  const [principal, setPrincipal] = useState<ClientPrincipalResult | { status: 'loading' }>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    resolveClientPrincipal().then((result) => {
      if (!cancelled) setPrincipal(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (principal.status === 'signed_out') {
      const returnPath = buildJourneyPath(intentionParam, witness)
      router.replace(`/auth/sign-in?return=${encodeURIComponent(returnPath)}`)
    }
  }, [principal.status, intentionParam, witness, router])

  if (principal.status === 'loading' || principal.status === 'signed_out') {
    return <p className="text-sm text-neutral-600">Loading…</p>
  }

  if (principal.status === 'error') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600" role="alert">Couldn&apos;t load your journey: {principal.message}</p>
        <button onClick={() => window.location.reload()} className="text-sm underline">Try again</button>
      </div>
    )
  }

  const hasBorrowedContext = witness === WITNESS_SLUG

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Continue Your Journey</h1>

      {intention ? (
        <p className="text-sm">
          <span className="text-neutral-500">What brought you here: </span>
          {intention.label}
        </p>
      ) : null}

      {hasBorrowedContext ? (
        <>
          <p className="text-sm">
            <span className="text-neutral-500">Witnessed: </span>
            {WITNESS_LABEL}
          </p>
          <p className="text-sm text-neutral-600">
            You explored the Drift practice in PrometheusK. If you completed
            it, your reflection lives there for now — there isn&apos;t yet a
            bridge that brings it back here.
          </p>
        </>
      ) : (
        <p className="text-sm text-neutral-600">
          Your journey is just getting started — nothing borrowed yet.
        </p>
      )}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        {hasBorrowedContext ? (
          <Link
            href={`/witness/${WITNESS_SLUG}${intentionParam ? `?intention=${intentionParam}` : ''}`}
            className="rounded-md bg-black px-6 py-3 text-center text-sm font-semibold text-white"
          >
            Revisit the practice
          </Link>
        ) : (
          <Link
            href="/start"
            className="rounded-md bg-black px-6 py-3 text-center text-sm font-semibold text-white"
          >
            Begin with an Echo
          </Link>
        )}
        <Link href="/account" className="text-sm underline self-center">
          Account Settings
        </Link>
      </div>
    </div>
  )
}

export default function JourneyPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Suspense fallback={<p className="text-sm text-neutral-600">Loading…</p>}>
        <JourneyGate />
      </Suspense>
    </div>
  )
}
