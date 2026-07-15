import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { verifyReceipt } from '@/lib/onboarding/receipt'
import { ONBOARDING_STATE_COOKIE } from '@/lib/onboarding/stateCookie'
import { readJourneyContext, recordPracticeCompletion } from '@/lib/journey/state'
import { ContinueGate } from './ContinueGate'

// RC5 -- this is now a Server Component specifically so receipt
// verification (an HMAC check against a server-only secret) can happen
// server-side, and so an already-signed-in visitor's completion can be
// persisted immediately rather than round-tripping through client JS.
// See docs/RC5_HANDOFF_CONTRACT.md.
export default async function ContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const search = await searchParams
  const intention = typeof search.intention === 'string' ? search.intention : null
  const witness = typeof search.witness === 'string' ? search.witness : null
  const receipt = typeof search.receipt === 'string' ? search.receipt : null

  let verified = false
  let unverifiedReason: string | null = null

  if (receipt) {
    const cookieStore = await cookies()
    const stateCookieValue = cookieStore.get(ONBOARDING_STATE_COOKIE)?.value ?? null
    const result = verifyReceipt(receipt, stateCookieValue)

    if (result.ok) {
      verified = true
      // Best-effort, same discipline as lib/journey/state.ts's
      // touchLastSeen: if the visitor isn't signed in yet, there's
      // nothing to attach this to -- ContinueGate forwards `receipt`
      // through the sign-in redirect, and this same verification runs
      // again (cheap, stateless) once they return signed in.
      try {
        const supabase = await createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const current = readJourneyContext(user.user_metadata)
          await recordPracticeCompletion(supabase, current, result.receipt.completedAt)
        }
      } catch {
        // best-effort -- never blocks rendering an honest "verified" state
      }
    } else {
      unverifiedReason = result.reason
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Suspense fallback={<p className="text-sm text-neutral-600">Loading…</p>}>
        <ContinueGate
          intention={intention}
          witness={witness}
          receipt={receipt}
          verified={verified}
          unverifiedReason={unverifiedReason}
        />
      </Suspense>
    </div>
  )
}
