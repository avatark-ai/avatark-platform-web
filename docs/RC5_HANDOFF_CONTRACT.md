# RC5 Handoff Contract — Signed Completion Receipt

Spans `avatark-platform-web` (this repo) and `prometheusk-web`. Full spec
recorded verbatim in `docs/RC5_SPEC.md`. This document describes what was
actually built.

## Why an auth-token handoff was rejected

RC4's audit (`docs/RC4_ROUTE_CONTRACT.md`) found no canonical return
mechanism and no cross-domain auth relationship between the two products'
Supabase projects. Building one for RC5 would have meant PrometheusK
issuing Platform some form of Supabase access token, refresh token, or
impersonation token — i.e. a session Platform could use to act as the
visitor against PrometheusK's API.

That's disproportionate to what RC5 actually needs. Platform doesn't need
to read PrometheusK's data, call PrometheusK's API, or know who the
visitor is on PrometheusK's side — it only needs one bit of trustworthy
information: *did this visitor complete the one canonical onboarding
practice, just now, as part of the handoff Platform itself started.*

So RC5 implements a narrow, single-purpose signed **completion receipt**
instead: proof of one fact, not a credential. It carries no identity, no
authorization, and no PrometheusK API access.

## Architecture

```
AvatarK Platform                                    PrometheusK
----------------                                    -----------
GET /witness/[slug]
  → GET /api/onboarding/begin
      generates random state (32 bytes, base64url)
      sets httpOnly state cookie (rc5_onboarding_state)
      redirects to PrometheusK borrow URL
      with ?source=avatark-onboarding&state=...&returnTo=...
                                                      BorrowedPracticePage
                                                        runtime → reflection
                                                        → echo → recommendation
                                                      (canonical completion —
                                                      see "Completion
                                                      determination" below)
                                                      user clicks
                                                      "Return to AvatarK"
                                                        → POST /api/onboarding/receipt
                                                          { practiceId, state,
                                                            source, returnTo }
                                                          validates practiceId
                                                          eligibility, state
                                                          shape, source,
                                                          returnTo origin
                                                          issues signed receipt
                                                      → redirect to returnTo
                                                        with ?receipt=...
GET /continue?receipt=...
  verifies receipt server-side:
    signature, issuer, audience, version,
    status, source, practice eligibility,
    expiry, iat skew, state-cookie match
  → verified: records practiceCompletedAt
    (signed-in visitors only)
  → /journey shows "✓ Completion verified
    by Prometheus"
```

The receipt is never treated as an authentication token: it does not sign
the visitor in, does not touch Supabase auth state on either side, and
Platform's own sign-in flow (magic link) is unaffected — `/continue`
verifies the receipt regardless of sign-in state, and re-verifies after a
signed-out visitor completes sign-in (the receipt is forwarded through
`?return=` on the sign-in link, since it's just a URL parameter).

## Completion determination (canonical, not self-reported)

The receipt-issuing "Return to AvatarK" CTA
(`prometheusk-web/components/onboarding/ReturnToAvatarK.tsx`) is only
rendered by `BorrowedPracticePage`
(`app/(workspace)/my/borrow/[journeyId]/practice/[practiceId]/page.tsx`)
once the visitor has reached the terminal `recommendation` stage of the
practice state machine — i.e. after `runtime → reflection → echo` have
all genuinely run. There is no code path that reaches this stage without
having gone through the others. `POST /api/onboarding/receipt` itself
does not re-check completion; it trusts that the only caller able to
reach it (a client component gated behind that stage) already enforces
this. The receipt claims `status: 'completed'` unconditionally — RC5
has exactly one outcome worth representing (there is no partial/abandoned
receipt), so the endpoint never issues anything else.

## Claim schema

```ts
{
  v: 1,                          // receipt version
  jti: string,                   // unique receipt ID (UUID)
  practice_id: string,           // canonical practice ID (must be receipt-eligible)
  status: 'completed',
  completed_at: string,          // ISO timestamp, set at issuance
  source: 'avatark-onboarding',
  state: string,                 // Platform's onboarding state/nonce, echoed back
  iss: 'prometheusk-web',
  aud: 'avatark-platform-web',
  iat: number,                   // unix seconds
  exp: number,                   // unix seconds, iat + 600 (10 minutes)
}
```

No reflection text, journal content, evidence, Living Echo content,
email, profile data, or any Supabase token/key appears in the receipt.
`verifyReceipt()` on Platform's side only ever returns three fields to
callers — `practiceId`, `completedAt`, `state` — even though it parses
the full claim set internally, so a bug in a caller can't accidentally
leak an unused claim.

## Signing and verification

HMAC-SHA256 over a compact two-part format:
`${base64url(JSON.stringify(claims))}.${base64url(hmac)}` — deliberately
not a general-purpose JWT library. With exactly one signer and one
verifier sharing one symmetric secret, a real JWT's header segment and
`alg` negotiation add attack surface (alg-confusion) without adding
anything this pair needs.

- `prometheusk-web/lib/onboarding/receipt.ts` — `issueReceipt()` (signs)
- `avatark-platform-web/lib/onboarding/receipt.ts` — `verifyReceipt()`
  (verifies)

These two files are hand-mirrored, not shared code — the repos are
independently deployed and don't share a package. If the claim shape
changes, both must be updated together.

Verification checks, in order: two-part shape → signature (constant-time,
`node:crypto`'s `timingSafeEqual`) → version → issuer (exact match) →
audience (exact match) → status → source → practice ID (must be in the
receipt-eligible allowlist) → expiry → issued-at (rejects a receipt
claiming to be issued more than 60 seconds in the future — clock-skew
allowance only) → state match against Platform's own state cookie
(constant-time).

Rejection is by explicit machine-readable reason
(`bad_signature`, `bad_issuer`, `expired`, `state_mismatch`, etc. — see
`ReceiptVerification` in `lib/onboarding/receipt.ts`), not a single opaque
failure, so `/continue` can show an honest, specific-enough message
without ever logging the receipt itself.

## Environment configuration

Names only — values are per-environment secrets, not committed:

- `ONBOARDING_RECEIPT_SECRET` — shared HMAC secret. Required in both
  repos; must differ between test/staging/production. Never
  `NEXT_PUBLIC_`-prefixed; read only in server-side code
  (`node:crypto`-dependent modules, never imported by client components).
- `ONBOARDING_ALLOWED_RETURN_ORIGINS` (prometheusk-web only) — comma-
  separated allowlist of origins the receipt endpoint may redirect a
  `returnTo` toward. Defaults to Platform's known production origin if
  unset; `localhost` is only ever accepted when `NODE_ENV !== 'production'`.

## Security constraints and how each is met

- **No Supabase/refresh/impersonation/service-role tokens issued** — the
  receipt carries no Supabase-recognizable credential at all.
- **No broad progress API token** — the receipt is a narrow completion
  fact, not an authorization grant; there is no API it can be used to
  call.
- **Short expiry** — 10 minutes (`RECEIPT_EXPIRY_SECONDS` in
  `prometheusk-web/lib/onboarding/receipt.ts`), within the spec's 10–15
  minute guidance.
- **Exact issuer/audience validation** — `bad_issuer`/`bad_audience`
  reject anything other than an exact string match; no substring or
  prefix matching.
- **Exact allowlisted return destination** — `isAllowedReturnOrigin()`
  (prometheusk-web) checks the `returnTo` origin against a configured
  allowlist before the receipt endpoint will act on it at all; this is
  checked before issuance, not just before redirect, so a rejected
  `returnTo` never gets a receipt minted for it either.
- **Constant-time signature verification** — `timingSafeEqual` for both
  the HMAC signature and the state-cookie comparison.
- **No secret in `NEXT_PUBLIC_` variables** — confirmed by inspection;
  `ONBOARDING_RECEIPT_SECRET` is read only in `node:crypto`-importing
  modules, which cannot be bundled client-side.
- **No receipt logging in full** — the only log statement on the issuing
  path (`app/api/onboarding/receipt/route.ts`) logs solely the failure
  mode string on a thrown error, never the claims or the signed token.
- **No open redirects** — `/api/onboarding/begin` only ever redirects to
  a PrometheusK URL built from a hardcoded origin
  (`PROMETHEUSK_ORIGIN`); the receipt endpoint only issues a receipt for
  an allowlisted `returnTo`, and the actual redirect to that `returnTo`
  happens client-side in `ReturnToAvatarK.tsx`, using a URL this repo
  validated, not visitor-supplied text rendered unescaped.

## Replay considerations

RC5 does not add one-time-use enforcement, per the spec's explicit
allowance: *"If implementing one-time-use requires a new cross-product
database table, stop and report. For RC5 test scope, a short-lived signed
receipt plus unique nonce may be acceptable if replay consequences are
limited and documented."* Building one-time-use tracking would require a
database both repos can write to and check — a new cross-product table,
which is a stop condition on its own.

What limits replay in practice:
- 10-minute expiry bounds the window.
- The receipt only unlocks recording `practiceCompletedAt` on the
  visitor's own journey record — an idempotent, low-value write (see
  `lib/journey/state.ts`'s `recordPracticeCompletion`), not account
  access, financial action, or data disclosure. Replaying it within the
  window just re-records the same `completedAt` value.
- The `jti` claim exists and is unique per issuance, so one-time-use
  enforcement can be added later purely by introducing a store keyed on
  it, without any change to the claim schema or signing format.

This is a documented, accepted gap for RC5's test scope, not an
oversight.

## Error states

`verifyReceipt()` returns a discriminated union
(`{ ok: true, receipt } | { ok: false, reason }`); `/continue` treats any
`ok: false` result as "not verified" and shows a plain, honest message
(never a fabricated success) — see `app/continue/ContinueGate.tsx`. A
missing or absent receipt is treated the same as a rejected one:
`/continue` still functions, it just doesn't claim a completion that
wasn't confirmed. `POST /api/onboarding/receipt` returns `400` for any
malformed/ineligible/untrusted request and `500` (with no claim data in
the log) if `ONBOARDING_RECEIPT_SECRET` is unset — it never falls back to
issuing an unsigned or weakly-signed receipt.

## Gold / Silver / Bronze impact

RC5 delivers the Silver-baseline item "signed completion receipt,
verified return to /continue, Journey acknowledgement" from
`docs/RC5_SPEC.md`. It does not touch Gold (confirmed practitioner,
recorded Episode 000, public Echo/share) or Bronze (unaffected — Bronze
never depended on a receipt).

## Deferred identity federation work

Explicitly out of scope for RC5, unchanged from the architecture
decision: a real shared-identity/session federation between the two
Supabase projects (SSO, shared JWT trust, or a cross-product identity
table) remains undone. If a future release needs Platform to read
PrometheusK data on the visitor's behalf (not just a completion fact),
that requires its own design pass and is not a natural extension of the
receipt format above — the receipt was deliberately built to not need
upgrading into that.

## RC4 documentation reclassification

Per this spec, `docs/RC4_ROUTE_CONTRACT.md`'s stop conditions #2 and #5
are reclassified:

- **Journey synchronization** — deferred beyond minimal RC5 completion
  receipt. RC5's `practiceCompletedAt` flag is the full extent of
  cross-product journey state Platform records; the richer
  synchronization RC4 originally scoped (progress feed, streaks, session
  history) remains undone and still requires the cross-domain auth RC4
  found missing.
- **Living Echo public preview** — deferred; authenticated-only today.
  RC5 deliberately does not build a public share-slug preview (see
  `docs/RC5_SPEC.md`'s "Living Echo Decision"); the authenticated
  `/my/echo` route in `prometheusk-web` is unaffected.
