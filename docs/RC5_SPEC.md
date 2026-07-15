# RC5 Spec — Signed Completion-Receipt Handoff

Recorded verbatim 2026-07-15, immediately on receipt, so it survives
any future session interruption (per the lesson from RC4's spec being
lost to a Cloud Workstation restart).

This replaces RC4's vague "canonical return contract" deliverable
(which was a stop condition — see `docs/RC4_ROUTE_CONTRACT.md`) with a
specific architecture: PrometheusK does not issue any Supabase
auth/session token to Platform. Instead it issues a narrow, short-lived
signed completion receipt after a real practice completion, and
Platform verifies that receipt server-side. This spans both
`avatark-platform-web` (this repo) and `prometheusk-web` — any
`prometheusk-web` changes must be based on that repo's real existing
practice-completion code, not guessed.

**Standing constraint, reaffirmed in this spec:** the practitioner
remains a content-only archetype (placeholder role "CEO of a major
global manufacturing company"), no real person's name anywhere in
code/routes/identifiers, Witness clearly labeled "AvatarK Demonstration
Experience," no fabricated biography or quotes, content layer swappable
without architecture changes for future real-practitioner casting.

```
==================================================
ARCHITECTURE DECISION
==================================================

PrometheusK must not issue:

- Supabase access tokens
- refresh tokens
- impersonation tokens
- service-role-derived credentials
- broad user-progress API tokens

AvatarK Platform does not need a PrometheusK session for RC5.

RC5 needs only a trustworthy proof that the canonical onboarding practice was completed.

Implement a narrow signed completion-receipt contract.

==================================================
RC5 HANDOFF CONTRACT
==================================================

The flow is:

AvatarK Platform
→ creates onboarding context and cryptographically random state/nonce
→ sends the visitor to the approved PrometheusK practice
→ PrometheusK completes the practice
→ PrometheusK creates a short-lived signed completion receipt
→ redirects to the allowlisted AvatarK Platform /continue route
→ AvatarK verifies the receipt server-side
→ /journey acknowledges verified completion

The receipt is not an authentication token.

==================================================
RECEIPT CLAIMS
==================================================

Use the minimum necessary claims:

- receipt version
- unique receipt ID / jti
- canonical practice ID
- completion status
- completed_at timestamp
- source = avatark-onboarding
- onboarding state/nonce supplied by Platform
- issued_at
- expires_at

Optional only if genuinely necessary:

- PrometheusK anonymous/session-neutral execution ID
- guide/archetype ID
- invitation/campaign ID

Do not include:

- reflection text
- journal content
- evidence contents
- Echo contents
- email
- profile data
- Supabase access token
- Supabase refresh token
- service-role key
- broad API authorization

==================================================
SIGNING AND VERIFICATION
==================================================

Choose a narrow signing mechanism appropriate to the repositories, such as:

- asymmetric signed JWT, preferred if practical; or
- HMAC-signed opaque receipt with separate per-environment secret

Requirements:

- separate test/staging/production secrets or key pairs
- short expiry, such as 10–15 minutes
- exact issuer and audience validation
- exact allowlisted return destination
- constant-time signature verification where applicable
- no secret in NEXT_PUBLIC variables
- no receipt logging in full
- no open redirects
- receipt replay protection where practical

If implementing one-time-use requires a new cross-product database table, stop and report. For RC5 test scope, a short-lived signed receipt plus unique nonce may be acceptable if replay consequences are limited and documented.

==================================================
PLATFORM ONBOARDING STATE
==================================================

AvatarK Platform should create and preserve a random onboarding state/nonce before handoff.

Bind the state to safe onboarding context:

- intention ID
- guide/archetype ID
- practice ID
- invitation/campaign ID where present
- expected return route

Do not put sensitive personal text in the URL.

On return, verify that the signed receipt state matches the original Platform state before showing verified completion.

==================================================
PROMETHEUSK OWNERSHIP
==================================================

PrometheusK remains the canonical owner of:

- practice runtime
- completion determination
- reflection runtime
- evidence
- Living Echo
- recommendations

For RC5, PrometheusK only returns the completion receipt.

It does not expose full progress APIs to Platform.

==================================================
AVATARK PLATFORM OWNERSHIP
==================================================

AvatarK Platform owns:

- Guide
- Threshold
- Orb
- onboarding context
- handoff state
- receipt verification
- /continue
- /journey continuity presentation

Platform may record or display only the verified, minimal completion fact allowed by the existing schema and approved architecture.

Do not create a product-domain copy of PrometheusK practice/reflection data.

Stop if a new database migration appears necessary.

==================================================
LIVING ECHO DECISION
==================================================

Do not block RC5 on a public Living Echo preview.

Current verified reality:

- authenticated Living Echo route exists
- public share-slug preview does not exist

For RC5:

- omit the live Echo preview, or
- show an explicitly conceptual future-state explanation

Do not fabricate a live user Echo.
Do not expose authenticated Echo data publicly.
Do not build share-slug infrastructure during RC5 unless separately approved.

==================================================
RC5 TARGET
==================================================

Treat SILVER as the baseline:

- placeholder Guide: CEO of a major global manufacturing company
- clearly labeled demonstration experience
- real Platform Threshold
- real Orb
- one canonical PrometheusK onboarding practice
- signed completion receipt
- verified return to /continue
- Journey acknowledgement
- invitation-compatible entry

GOLD remains a stretch:

- confirmed practitioner
- recorded Episode 000
- approved public Echo/share experience

BRONZE remains guaranteed fallback:

- Guide story
- Threshold and Orb
- one practice demonstration
- interest capture
- follow-up

==================================================
TESTS
==================================================

Verify:

1. Platform generates a cryptographically random onboarding state.
2. Handoff includes only allowlisted safe parameters.
3. PrometheusK rejects unsupported practice IDs.
4. Completion receipt is issued only after canonical completion.
5. Receipt signature verifies in AvatarK Platform.
6. Incorrect issuer is rejected.
7. Incorrect audience is rejected.
8. Expired receipt is rejected.
9. Modified receipt is rejected.
10. State/nonce mismatch is rejected.
11. Untrusted return URL is rejected.
12. Valid receipt reaches /continue.
13. /journey shows verified completion honestly.
14. No reflection/Echo/evidence data crosses the boundary.
15. No auth token is issued.
16. Signed-out and signed-in Platform return paths remain functional.
17. Lint passes in both repositories.
18. Typecheck passes in both repositories.
19. Tests pass in both repositories.
20. Production builds pass in both repositories.
21. Hosted cross-domain journey is verified where deployment access permits.

Do not claim hosted verification based solely on local fixtures.

==================================================
DOCUMENTATION
==================================================

Update or create:

docs/RC5_HANDOFF_CONTRACT.md

Include:

- why auth-token issuance was rejected
- completion-receipt architecture
- claim schema
- signing and verification model
- environment configuration names, not values
- security constraints
- replay considerations
- error states
- Gold/Silver/Bronze impact
- deferred identity federation work

Update RC4 documentation to classify:

Journey synchronization:
Deferred beyond minimal RC5 completion receipt.

Living Echo public preview:
Deferred; authenticated-only today.

==================================================
STOP CONDITIONS
==================================================

Stop and report if:

- completion cannot be determined canonically
- PrometheusK practice runtime cannot emit the receipt safely
- a shared user session is required
- a new cross-product identity table is required
- sensitive reflection data would need to cross the boundary
- the receipt requires broad authorization semantics
- a new production migration is required
- hosted return cannot be allowlisted safely

Proceed with the minimal signed completion-receipt design and RC5 Silver baseline.

Do not begin full cross-product journey synchronization or public Living Echo sharing.
```

## Status

Spec recorded 2026-07-15. Implementation in progress — see this
repo's commit log and `docs/RC5_HANDOFF_CONTRACT.md` (to be completed
once implementation concludes or a stop condition is hit) for outcome.
