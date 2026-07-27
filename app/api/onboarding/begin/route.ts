import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { buildBorrowUrl } from '@/lib/onboarding/prometheusk'
import { buildSafeReturnTo, resolvePracticeHandoffTarget } from '@/lib/onboarding/practiceHandoff'
import { isIntentionId } from '@/lib/onboarding/intentions'
import { ONBOARDING_STATE_COOKIE } from '@/lib/onboarding/stateCookie'

// RC5 -- the sole place this repo generates the onboarding state/nonce
// and sets the cookie /continue later reads to verify a completion
// receipt's `state` claim matches the handoff THIS browser started.
// The Witness page links here instead of building a PrometheusK URL
// directly, so state generation + cookie-setting can happen in a Route
// Handler (Server Components can't reliably set cookies during render).
const STATE_COOKIE_MAX_AGE_SECONDS = 20 * 60 // covers a slower magic-link sign-in round trip; the receipt itself expires sooner (10 min)

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const witness = searchParams.get('witness')
  const intentionParam = searchParams.get('intention')
  const invitation = searchParams.get('invitation')
  const cohort = searchParams.get('cohort')

  if (!witness) {
    return NextResponse.redirect(`${origin}/start`)
  }

  // Explicit, slug-keyed resolution -- never a fixed default practice.
  // Under normal navigation the practice/witness detail pages already
  // hide the "Begin Practice" CTA when this resolves to null, so hitting
  // this branch means a stale link or direct URL tampering; land back on
  // the practice's own page, which renders an honest unavailable state.
  const target = resolvePracticeHandoffTarget(witness)
  if (!target) {
    return NextResponse.redirect(`${origin}/practice/${encodeURIComponent(witness)}?handoff=unavailable`)
  }

  const intention = isIntentionId(intentionParam) ? intentionParam : null
  const state = randomBytes(32).toString('base64url')
  const returnTo = buildSafeReturnTo(origin, '/continue')

  const borrowUrl = new URL(buildBorrowUrl({ target, intention, witness, invitation, cohort, returnTo }))
  borrowUrl.searchParams.set('state', state)

  const response = NextResponse.redirect(borrowUrl.toString())
  response.cookies.set(ONBOARDING_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  })
  return response
}
