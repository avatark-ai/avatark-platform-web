# Identity Migration — PrometheusK (`prometheusk-web`)

Restructures `docs/MIGRATION_PROMETHEUSK.md` onto the mission's required template. **This guide supersedes that doc's ownership claim**: `docs/MIGRATION_PROMETHEUSK.md` stated PrometheusK is `@avatark/account`'s "canonical source, not a consumer needing to adopt it." That was true before this session. As of this mission, `avatark-platform-web` forked `prometheusk-web/packages/avatar-account` into `packages/account` (see `packages/account/PROVENANCE.md`) and is now the canonical owner; **PrometheusK is expected to become a consumer of this repo's package going forward, not the upstream**. `prometheusk-web` was not modified in this session (read-only reference only) — its own copy of `packages/avatar-account` still works today and will continue to until PrometheusK's own team completes the migration described here.

## Repository / path
`prometheusk-web` (sibling repo). Domain: `https://prometheusk.avatark.io`. Own, separate Supabase project (ref `bxerfgwrtwowzgahdgrj`, distinct from AvatarK's).

## ⚠️ Do not force PrometheusK onto AvatarK's cookie/SSR auth architecture

This boundary from the prior guide still holds and is not affected by the package-ownership change above. PrometheusK is architecturally Bearer-token based (`Authorization: Bearer <token>`, no cookies, no `@supabase/ssr`, no middleware) — a deliberate, real product-level choice (`docs/AUTH_REFERENCE_IMPLEMENTATION.md`). `PRODUCT_REGISTRY`'s `supportsAuth`/`supportsAccount: false` for `prometheusk` correctly reflects this as an intentional fact, not a gap. **Adopting the new `packages/account`/`@avatark/auth-ui` UI layer does not require adopting AvatarK's session/cookie model** — the account/auth-ui component contracts accept host-supplied adapters and callbacks; they hold no opinion on Bearer-vs-cookie transport.

## What to retire
1. **Confirmed real defect**: PrometheusK's own `sanitizeNext` does not catch the backslash-host open-redirect trick (`/\evil.example.com` passes its checks today, per `docs/AUTH_REFERENCE_IMPLEMENTATION.md`, behavior #4). Replace with `@avatark/auth`'s `safeReturnPath` — a pure, framework-agnostic function that works identically under Bearer-token architecture (no cookie/`@supabase/ssr`/middleware dependency).
2. PrometheusK's own copy of the now-superseded vendored tarball flow — once PrometheusK points its own `package.json` at this repo's `@avatark/account` (via a private registry or git dependency, since this repo does not publish publicly), the PrometheusK-side host adapter should be rewritten against the canonical contract in `packages/account/src/contracts/adapters.ts`, not the pre-fork shape (hardcoded `usagePractices`/`borrowedCount` fields no longer exist on `MembershipSummary` — see `packages/account/PROVENANCE.md` item 3).
3. Any second, divergent sign-out call path, if one exists (the audited "two divergent sign-out sites" finding referenced PrometheusK's `TopNav.tsx` calling Supabase directly vs. an adapter path).

## Package artifacts to consume
`@avatark/auth` (for `safeReturnPath` only — not the cookie-based flow), `@avatark/account` (as the new canonical UI/contract source), `@avatark/account-ui`, `@avatark/product-registry`, `@avatark/navigation`, `@avatark/bootstrap`'s Environment Validator for non-auth env vars only.

## Required adapter
`AccountAdapters` implemented against PrometheusK's own Bearer-token session and its real Living Echo/practice data. **Living Echo and Practice Activity must be registered as `ExtensionAdapter`s** (`docs/ACCOUNT_EXTENSION_CONTRACT.md`), not folded into `ProfileAdapter`/`MembershipAdapter` — this is exactly the generalization this fork introduced specifically so PrometheusK's own domain data has a real home in the canonical shell.

## Product identity configuration
From `getProductIdentityConfig("prometheusk")`:
- `signInContext`: "You will return to PrometheusK, where your practices and Living Echo live."
- `defaultReturnPath`: `/`
- `allowedLocalRoutePrefixes`: `/`, `/practices`, `/echo`
- `privacyNote`: "Your practices and Living Echo are private to you unless you choose to share them."
- `deploymentStatus`: live · `integrationStatus`: **live** (the one product besides AvatarK itself already marked `live` — real, confirmed platform integration exists today, chiefly around Living Echo) · `accessState`: available

## Living Echo and Practice Activity preservation (mandatory)
Per the mission's explicit instruction, this migration must preserve:
- **Living Echo context** — register as an `ExtensionAdapter` with `slotId: 'living-echo'`, returning `ExtensionItem`s that link back into PrometheusK's own real Echo routes (not a re-hosted copy).
- **Practice Activity** — `slotId: 'practice-activity'`, same pattern.
- **Authoring** and **Borrowed Practices** — `slotId: 'authoring'` / `slotId: 'borrowed-practices'`, completing the four-item extension list `identityConfig.ts` already reserves for `prometheusk`.
- **PrometheusK's existing product data model** — the fork's generalization (`StatEntry[]` instead of hardcoded `practices`/`reflections`/`borrowed`/`publishedEchoes`/`draftEchoes`) does not require changing PrometheusK's own database schema — it only changes what shape PrometheusK's *adapter* hands to the shared UI. PrometheusK computes its real stats however it already does and maps them to `{ key, label, value }` at the adapter boundary.
- **Current public routes** — this migration is Auth/Account-surface only; PrometheusK's own public practice/Echo routes are unaffected.

The deprecated `ActivityAdapter`/`EchoesAdapter` pair (kept in `packages/account/src/extensions/` for API compatibility with the original fork) exists because it was literally PrometheusK-shaped in the source. **New PrometheusK code should use the generic `extensions` mechanism above, not this deprecated pair** — using it would just be re-adopting the exact vocabulary leak this fork was built to remove.

## Entitlement / organization concerns
`accessState: available` — no entitlement gate on the base practice experience. Organization context (Workshop cohort, Community group) is relevant if/when PrometheusK adds cohort-based practice programs.

## Environment variables
PrometheusK's own env var naming (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, distinct from this repo's `NEXT_PUBLIC_SUPABASE_ANON_KEY`) is **not required to change** — this is an explicit, deliberate divergence to preserve, not a defect.

## Supabase Redirect URL entries
No change required to PrometheusK's own Supabase project's redirect URLs — this migration does not touch PrometheusK's Bearer-token auth flow itself, only its Account UI/adapter layer and its return-path safety check.

## Manual verification
1. Confirm the `safeReturnPath` swap actually closes the backslash-host gap (`sanitizeNext`'s confirmed weakness).
2. Confirm Living Echo/Practice Activity/Authoring/Borrowed Practices all render real data through the new `ExtensionAdapter` mechanism, not the deprecated `activity`/`echoes` pair.
3. Confirm no second sign-out call path remains.
4. `checkProductConformance("prometheusk", { env: {...} })` — expect `supportsAuth`/`supportsAccount` capability checks to correctly report `not_supported` (this is correct, not a failure to chase).

## Rollback plan
PrometheusK's own copy of the pre-fork `packages/avatar-account` continues to work — reverting means not repointing PrometheusK's dependency at this repo's `packages/account` yet. No cross-repo breaking change occurs from AvatarK Platform's side, since the fork preserved the package's public API (`packages/account/PROVENANCE.md`).

## Backward-compatible routes
All of PrometheusK's existing public routes (practice, Echo, reflection) remain unaffected — this migration is scoped to Auth/Account UI and the return-path safety fix only.
