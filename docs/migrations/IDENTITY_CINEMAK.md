# Identity Migration — CinemaK (`cinemak-web`)

Net-new migration guide. CinemaK.ai is **live on DNS today** — per the mission's explicit instruction, that must never be conflated with "coming soon" just because shared-identity integration is incomplete.

## Repository / path
`cinemak-web` (sibling repo). Domain: `https://cinemak.ai`.

## Current implementation
`status: alpha`, `visibility: internal`, `integrationStatus: vision` (the lowest rung — "scope not yet integrated with Platform," per `PRODUCT_REGISTRY`). `supportsStreaming: true`, `supportsContent: true`. `supportsAuth`/`supportsAccount`: `false`.

## What to retire
Not audited from this repo — if CinemaK has its own ad hoc sign-in or account surface, replace it with the canonical packages below rather than extend it in place.

## Package artifacts to consume
`@avatark/auth`, `@avatark/auth-ui`, `@avatark/account`, `@avatark/account-ui`, `@avatark/product-registry`, `@avatark/invitations`, `@avatark/organizations`, `@avatark/bootstrap`.

## Required adapter
`AccountAdapters` against CinemaK's own Supabase project. Watch history/saved films belong in generic `ExtensionAdapter`s; premiere/screening/industry access (below) needs its own entitlement-aware adapter, not a plain content list.

## Product identity configuration
From `getProductIdentityConfig("cinemak")`:
- `signInContext`: "You will return to CinemaK to continue your cinematic experience."
- `defaultReturnPath`: `/`
- `allowedLocalRoutePrefixes`: `/`, `/watch`, `/premieres`
- `privacyNote`: "Signing in does not grant access to premieres, screenings, or industry-only content you have not been invited to."
- `deploymentStatus`: **live** (DNS reachable, confirmed) · `integrationStatus`: pending_shared_identity · `accessState`: entitlement_dependent

**CinemaK-specific note:** `deploymentStatus: live` and `accessState: entitlement_dependent` are both true simultaneously and must be displayed as distinct facts — CinemaK being reachable does not mean an arbitrary signed-in user can watch a premiere.

## Premiere / screening / industry-access extension (CinemaK-specific)

Mission Part 10/18 requires a dedicated section for this. Register as separate `ExtensionAdapter` slots, not folded into `watch-history`:

- `premieres` — upcoming/attended premieres, entitlement-gated (invitation- or purchase-sourced).
- `screenings-and-invitations` — private screening invites, sourced from `@avatark/invitations` (ArenaK-issued or CinemaK-issued).
- `festival-industry-access` — a distinct, higher-privilege entitlement (`source: administrator` or a future `industry_credential` source) — never granted by default sign-in.
- `contributor-credits` — attribution data, read-only from the signed-in user's own contributions; must not expose another contributor's private contact/financial info.
- `production-distribution-rights` — rights-holder-only visibility; gate with `resolveCapability()` (`docs/MEMBERSHIP_ENTITLEMENT_AUTHORIZATION.md`), default-deny when entitlement is unknown.

None of these five should ever be fabricated as "coming soon" placeholders with fake data — an honest empty state (`ExtensionSlotContent.emptyMessage`) is correct until each has a real adapter.

## Entitlement / organization concerns
Festival/industry access and production/distribution rights are organization-relevant (Production team / Community group org types) — a person's industry credential is plausibly tied to which organization vouched for them, not a personal attribute alone.

## Environment variables
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.

## Supabase Redirect URL entries
`https://cinemak.ai/auth/callback`.

## Manual verification
Not exercisable from this repo. Once wired: Google/magic-link flows, Account rendering, and specifically that `festival-industry-access`/`production-distribution-rights` render nothing (not a fabricated row) for a user without that entitlement.

## Rollback plan
No existing CinemaK integration is confirmed to be displaced — adoption is additive.

## Backward-compatible routes
Not audited — treat CinemaK's existing public routes (its live DNS content) as backward-compatible by default; this guide only concerns Auth/Account, not content routing.
