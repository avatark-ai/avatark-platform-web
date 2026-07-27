import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { classifyInvitationStatus } from '@avatark/invitations'
import { buildBorrowUrl } from '@/lib/onboarding/prometheusk'
import { buildSafeReturnTo, resolvePracticeHandoffTarget } from '@/lib/onboarding/practiceHandoff'
import { isIntentionId } from '@/lib/onboarding/intentions'
import { ONBOARDING_STATE_COOKIE } from '@/lib/onboarding/stateCookie'
import { echoInvitationResolver } from '@/lib/invitations/echoResolver'
import { invitationMatchesWitness } from '@/lib/invitations/destination'

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

  // Echo only ever hands off a VALIDATED invitation to PrometheusK (see
  // packages/invitations). An invitation carried this far that's since
  // expired/been revoked/run out of uses must never quietly ride along
  // to a real practice handoff -- land back on its own honest unavailable
  // state instead, same principle as the practice-existence check above.
  if (invitation) {
    const resolved = await echoInvitationResolver.resolve(invitation)
    // An invitation naming a specific practice (practice/echo_practice)
    // must never be honored for a DIFFERENT `witness` -- otherwise a
    // mismatched pairing (tampered URL, or a future caller bug) would
    // let an invitation for one practice silently authorize a handoff to
    // another. Never checked before now, because no practice mapping
    // existed yet for this to actually matter; still a real gap in the
    // "never substitute another practice" guarantee, not just a
    // theoretical one, since the very next practice mapping added would
    // have been exploitable through it.
    const usable = !!resolved && classifyInvitationStatus(resolved, new Date()) === 'pending' && invitationMatchesWitness(resolved.destination, witness)
    if (!usable) {
      return NextResponse.redirect(`${origin}/enter/${encodeURIComponent(invitation)}`)
    }
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
