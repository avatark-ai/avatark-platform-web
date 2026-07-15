'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { resolveClientPrincipal, type ClientPrincipalResult } from '@/lib/auth/resolveClientPrincipal'

function buildContinuePath(intention: string | null, witness: string | null): string {
  const params = new URLSearchParams()
  if (intention) params.set('intention', intention)
  if (witness) params.set('witness', witness)
  const query = params.toString()
  return query ? `/continue?${query}` : '/continue'
}

function ContinueGate() {
  const searchParams = useSearchParams()
  const intention = searchParams.get('intention')
  const witness = searchParams.get('witness')

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

  if (principal.status === 'loading') {
    return <p className="text-sm text-neutral-600">Loading…</p>
  }

  if (principal.status === 'error') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600" role="alert">Couldn&apos;t check your session: {principal.message}</p>
        <button onClick={() => window.location.reload()} className="text-sm underline">Try again</button>
      </div>
    )
  }

  if (principal.status === 'signed_in') {
    return (
      <div className="space-y-4">
        <p className="text-lg">You completed your first practice.</p>
        <p className="text-lg">What you noticed belongs to your journey.</p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Link
            href={witness || intention ? `/journey?${new URLSearchParams({ ...(intention ? { intention } : {}), ...(witness ? { witness } : {}) }).toString()}` : '/journey'}
            className="rounded-md bg-black px-6 py-3 text-center text-sm font-semibold text-white"
          >
            Continue Your Journey
          </Link>
          <Link href="/account" className="text-sm underline self-center">
            Account Settings
          </Link>
        </div>
      </div>
    )
  }

  // signed_out
  const returnPath = buildContinuePath(intention, witness)
  return (
    <div className="space-y-4">
      <p className="text-lg">What you just noticed is how your journey begins.</p>
      <p className="text-lg">Would you like to keep it?</p>
      <p className="text-sm text-neutral-600">
        Signing in carries this forward — no password, just a link sent to your email.
      </p>
      <Link
        href={`/auth/sign-in?return=${encodeURIComponent(returnPath)}`}
        className="inline-block rounded-md bg-black px-6 py-3 text-sm font-semibold text-white"
      >
        Sign in to continue
      </Link>
    </div>
  )
}

export default function ContinuePage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Suspense fallback={<p className="text-sm text-neutral-600">Loading…</p>}>
        <ContinueGate />
      </Suspense>
    </div>
  )
}
