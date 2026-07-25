'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { resolveClientPrincipal, type ClientPrincipalResult } from '@/lib/auth/resolveClientPrincipal'
import { MY_ECHO_HREF, TODAY_HREF } from '@/lib/echo/links'

function buildContinuePath(intention: string | null, witness: string | null, receipt: string | null): string {
  const params = new URLSearchParams()
  if (intention) params.set('intention', intention)
  if (witness) params.set('witness', witness)
  if (receipt) params.set('receipt', receipt)
  const query = params.toString()
  return query ? `/continue?${query}` : '/continue'
}

// RC5 -- `verified`/`unverifiedReason` come from a real, server-side
// signature check of PrometheusK's completion receipt (see
// app/continue/page.tsx), never from anything this client component
// computes itself. Copy only asserts completion when `verified` is
// true -- no fabricated completion, matching this repo's existing
// honesty standard for /journey.
export function ContinueGate({
  intention,
  witness,
  receipt,
  verified,
  unverifiedReason,
}: {
  intention: string | null
  witness: string | null
  receipt: string | null
  verified: boolean
  unverifiedReason: string | null
}) {
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

  const todayHref =
    witness || intention
      ? `${TODAY_HREF}?${new URLSearchParams({ ...(intention ? { intention } : {}), ...(witness ? { witness } : {}) }).toString()}`
      : TODAY_HREF

  const unverifiedNote =
    unverifiedReason === 'expired'
      ? "the confirmation link had expired by the time you signed in"
      : "we couldn't confirm it just now"

  if (principal.status === 'signed_in') {
    return (
      <div className="space-y-4">
        {verified ? (
          <>
            <p className="text-lg font-semibold">Practice Complete</p>
            <p className="text-lg">Added to Your Echo.</p>
          </>
        ) : receipt ? (
          <>
            <p className="text-lg">Welcome back.</p>
            <p className="text-sm text-neutral-600">
              We saw you visit a practice, but {unverifiedNote} — you can still continue.
            </p>
          </>
        ) : (
          <p className="text-lg">Welcome back.</p>
        )}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Link
            href={todayHref}
            className="rounded-md bg-black px-6 py-3 text-center text-sm font-semibold text-white"
          >
            Continue to Today
          </Link>
          <Link href={MY_ECHO_HREF} className="text-sm underline self-center">
            View My Echo
          </Link>
        </div>
      </div>
    )
  }

  // signed_out
  const returnPath = buildContinuePath(intention, witness, receipt)
  return (
    <div className="space-y-4">
      {verified ? (
        <>
          <p className="text-lg">What you just noticed is how your journey begins.</p>
          <p className="text-lg">Would you like to keep it?</p>
        </>
      ) : receipt ? (
        <>
          <p className="text-lg">We couldn&apos;t confirm that practice just now.</p>
          <p className="text-lg">You can still keep going.</p>
        </>
      ) : (
        <p className="text-lg">Would you like to keep what you noticed?</p>
      )}
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
