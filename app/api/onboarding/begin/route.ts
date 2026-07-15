import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { buildBorrowUrl } from '@/lib/onboarding/prometheusk'
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

  const intention = isIntentionId(intentionParam) ? intentionParam : null
  const state = randomBytes(32).toString('base64url')
  const returnTo = `${origin}/continue`

  const borrowUrl = new URL(buildBorrowUrl({ intention, witness, invitation, cohort, returnTo }))
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
