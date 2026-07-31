# Identity Migration — StreamK (`streamk-web`)

Restructures `docs/MIGRATION_STREAMK.md` onto the mission's required template. Domain reachable (`streamk.ai`) but feature-level Platform integration is unconfirmed — closer to a green-field adoption guide than a migration away from existing code.

## Repository / path
`streamk-web` (sibling repo, not inspectable from here). Domain: `https://streamk.ai`.

## Current implementation
`supportsInvitations: true` (named target consumer, not confirmed implemented). `supportsAuth`/`supportsAccount`: `false` (unconfirmed). `integrationStatus: in-development`. This repo's own `/watch-first` route has no per-story StreamK content or integration today (`lib/onboarding/streamHandoff.ts`'s registry is deliberately empty).

## What to retire
Nothing confirmed. If a placeholder cross-product link exists, replace with the real contracts below.

## Package artifacts to consume
`@avatark/auth`, `@avatark/auth-ui`, `@avatark/account`, `@avatark/account-ui`, `@avatark/product-registry`, `@avatark/invitations`, `@avatark/bootstrap`.

## Required adapter
Implement `AccountAdapters` against StreamK's own Supabase project. Watch history/saved stories/playback preferences/publisher access belong in `ExtensionAdapter`s.

## Product identity configuration
From `getProductIdentityConfig("streamk")`:
- `signInContext`: "You will return to StreamK to continue watching."
- `defaultReturnPath`: `/`
- `allowedLocalRoutePrefixes`: `/`, `/watch`
- `privacyNote`: "Signing in does not grant access to content you are not entitled to watch."
- `deploymentStatus`: live · `integrationStatus`: pending_shared_identity · `accessState`: entitlement_dependent

## Product extension sections
`watch-history`, `saved-stories`, `playback-preferences`, `publisher-access`.

## Entitlement / organization concerns
`accessState: entitlement_dependent` — watching gated content requires entitlement, not just sign-in. `publisher-access` is a distinct, higher-privilege extension — gate it by role/capability (`docs/MEMBERSHIP_ENTITLEMENT_AUTHORIZATION.md`), never by UI visibility alone.

## Environment variables
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.

## Supabase Redirect URL entries
`https://streamk.ai/auth/callback`, once StreamK's own Supabase project's auth mount exists.

## Manual verification
Cannot be exercised from this repo — no reachable source. Once StreamK stands up a real auth mount: Google/magic-link flows, Account rendering, `watch` deep-link resolution via `@avatark/navigation`'s `watchLink(slug)`.

## Rollback plan
Adopt-from-scratch — no existing StreamK auth/account implementation is displaced, so reverting simply means not adopting these packages yet.

## Backward-compatible routes
`/watch-first`-equivalent routes (if StreamK has them) are unaffected — this guide only concerns Auth/Account, not content routing.
