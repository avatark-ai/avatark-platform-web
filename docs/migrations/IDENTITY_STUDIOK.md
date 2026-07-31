# Identity Migration — StudioK

Restructures `docs/MIGRATION_STUDIOK.md` onto the mission's required template. StudioK has **no confirmed local repository in this workspace** (`PRODUCT_REGISTRY`'s `studiok.repository: null`) — this is a green-field adoption guide, not a verified audit of existing code.

## Repository / path
Unconfirmed. A real, actively-deployed Vercel project exists under a name that doesn't match this ecosystem's planning docs (`docs/PRODUCT_REGISTRY.md`). Domain: `https://studiok.dt4m.ai`. **Resolving StudioK's real repository identity is a prerequisite** — everything below is a target contract with nothing to wire it into until that's confirmed.

## Current implementation
`supportsAuth`/`supportsAccount`/`supportsNavigation`: `false` (unconfirmed, not necessarily absent). `visibility: internal`, `status: alpha`. No `journeyRole`/`integrationStatus` set today.

## What to retire
Nothing confirmed — no known existing StudioK-side identity/account code to remove. If a placeholder/mock sign-in exists, replace it with the real contracts below rather than extend the mock.

## Package artifacts to consume
`@avatark/auth`, `@avatark/auth-ui`, `@avatark/account`, `@avatark/account-ui`, `@avatark/product-registry`, `@avatark/membership`, `@avatark/organizations`, `@avatark/bootstrap`.

## Required adapter
Implement `AccountAdapters` against StudioK's own Supabase project (once confirmed) and `public.profiles`-equivalent table. Creator-specific data (workspaces, collaborators, publishing rights) belongs in `ExtensionAdapter`s, not the core adapter.

## Product identity configuration
From `getProductIdentityConfig("studiok")`:
- `signInContext`: "You will return to StudioK to continue creating."
- `defaultReturnPath`: `/`
- `allowedLocalRoutePrefixes`: `/`, `/workspaces`
- `privacyNote`: "Signing in does not grant access to another creator's workspace or unpublished work."
- `deploymentStatus`: live (domain reachable) · `integrationStatus`: pending_shared_identity · `accessState`: entitlement_dependent

## Product extension sections
`creator-access`, `workspaces`, `collaborators`, `publishing-rights` (mission Part 10's exact list).

## Entitlement / organization concerns
`accessState: entitlement_dependent` — creator access is not automatically granted on sign-in. Organization context is directly relevant here (Production team / Workshop cohort org types, `docs/ORGANIZATION_CONTEXT.md`) since StudioK workspaces are plausibly organization-scoped.

## Environment variables
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` — once a real StudioK Supabase project/repo is confirmed.

## Supabase Redirect URL entries
`https://studiok.dt4m.ai/auth/callback`, once StudioK's own Supabase project is confirmed and its auth route exists.

## Manual verification
Cannot be exercised from this repo — no reachable source or environment. Once StudioK's repository is confirmed: Google sign-in visibility, magic-link round-trip, Account section rendering, and the four extension tabs above.

## Rollback plan
No shared-package API is broken by StudioK adopting these packages fresh — if adoption is reverted, StudioK's prior (unconfirmed) auth surface is unaffected.

## Backward-compatible routes
Unconfirmed — no known existing routes to preserve. Whoever owns StudioK's real repository should treat any existing public routes as backward-compatible by default until confirmed otherwise.

## Registry follow-up (not this guide's job to fix)
`journeyRole`/`journeyOrder`/`integrationStatus`/`nextProductIds` remain unset for `studiok` in `PRODUCT_REGISTRY` — a registry-data change in this repo, not something StudioK's own repo does. Flagged here, not fixed, since StudioK's real position in the platform journey (if any) hasn't been decided.
