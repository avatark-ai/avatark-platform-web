# Migration guide — PrometheusK (`prometheusk-web`)

**Read this first:** this repo has no access to `prometheusk-web`'s actual source — everything below
is either (a) a confirmed fact already established in this repo's own doc corpus (cited inline), or
(b) generic guidance, not a verified audit of PrometheusK's current code.

## ⚠️ Do not force PrometheusK onto AvatarK's cookie/SSR auth architecture

This is the one migration item in this document set that is **explicitly bounded, not open-ended**.
PrometheusK is architecturally Bearer-token based (`Authorization: Bearer <token>`, no cookies, no
`@supabase/ssr`, no middleware) — a deliberate, real product-level choice, not an oversight
(`docs/AUTH_REFERENCE_IMPLEMENTATION.md`: "a product-level choice that conflicts with AvatarK's
cookie/SSR session model... its own `.env` naming... route naming... and Supabase project ref... are
product-specific and were not ported"). PrometheusK also runs its **own, separate Supabase project**
(ref `bxerfgwrtwowzgahdgrj`, distinct from AvatarK's `hapoerzbcnagyfafqojg`) and is the sole real
producer of Living Echo (`docs/PLATFORM_CONTRACTS.md`). None of that is in scope to change here.
`PRODUCT_REGISTRY`'s entry for `prometheusk` correctly reflects this: `supportsAuth` and
`supportsAccount` are both `false` — not a gap to close, a confirmed, intentional architectural fact.

## What to delete

1. **`sanitizeNext`'s weaker open-redirect guard.** Confirmed by direct construction
   (`docs/AUTH_REFERENCE_IMPLEMENTATION.md`, behavior #4): PrometheusK's own return-path sanitizer
   does not catch the backslash-host trick (`/\evil.example.com` resolves to a foreign origin and
   passes its checks today). This is a real, exploitable open-redirect gap in PrometheusK's own code,
   independent of the auth-architecture question above.
2. **Any second, divergent sign-out call path**, if one exists in PrometheusK's code today — not
   independently confirmed for PrometheusK specifically (the audited "two divergent sign-out sites"
   finding was about PrometheusK's `TopNav.tsx` calling Supabase directly vs. an adapter path calling
   a service wrapper, per `docs/AUTH_REFERENCE_IMPLEMENTATION.md`, behavior #8) — worth auditing and
   consolidating to one call path regardless of Bearer-token vs. cookie architecture.

## What to replace it with

1. **`@avatark/auth`'s `safeReturnPath`**, in place of `sanitizeNext`. This is a pure, framework-
   agnostic function (`packages/auth/src/safeReturnPath.ts`) — it works identically under a
   Bearer-token architecture, since it only validates a path string against a dummy origin, with no
   dependency on cookies, `@supabase/ssr`, or middleware. This is the one piece of this migration
   that applies regardless of the architecture-divergence boundary above.
2. **`@avatark/product-registry` and `@avatark/navigation`** for any cross-product linking
   PrometheusK does today (e.g. its own "Return to Avatar" or similar continuity link, the mirror
   image of this repo's `lib/journey/continuity.ts`) — both packages are framework-agnostic and make
   no assumption about PrometheusK's own auth model.
3. **`@avatark/bootstrap`'s Environment Validator only for the non-auth env vars** — Site URL,
   callback URL if PrometheusK has one, preview URL. Do **not** treat a `supportsAuth: false`/
   `supportsAccount: false` result from `checkProductConformance` as a defect to fix — for
   PrometheusK specifically, those are correct, cited, intentional values (see the warning above).

## What's confirmed NOT required

- No change to PrometheusK's Bearer-token session model, its own env var naming
  (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), its own route naming (`/login` + `?next=`), or its own
  Supabase project — all four are explicitly out of scope, named as deliberate divergences to
  preserve, not defects (`docs/AUTH_REFERENCE_IMPLEMENTATION.md`).
- No requirement to consume `@avatark/account` as this repo does — PrometheusK is that package's
  **canonical source** (`prometheusk-web/packages/avatar-account`), not a consumer needing to adopt
  it (`docs/PLATFORM_CONTRACTS.md`'s Account section).

## Verification PrometheusK should run

`checkProductConformance("prometheusk", { env: {...} })` — expect `supportsAuth`/`supportsAccount`
capability checks to correctly reflect `not_supported` rather than treating that as a failure to
chase; focus verification instead on the `return_paths` check (confirming the `safeReturnPath` swap
actually closed the backslash-host gap) and any cross-product deep links PrometheusK builds toward
AvatarK, GameK, or ArenaK.
