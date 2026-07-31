# Identity Migration — Atlas (`atlas-web`)

Net-new migration guide — no prior `docs/MIGRATION_ATLAS.md` existed. This repo has a sibling `atlas-web` directory in the workspace but has not audited its source as part of this session; facts below come from `PRODUCT_REGISTRY` and this session's new contracts, not a code review of `atlas-web`.

## Repository / path
`atlas-web` (sibling repo). Domain: `https://atlas.dt4i.ai`.

## Current implementation
`supportsContent: true`. `supportsAuth`/`supportsAccount`/`supportsNavigation`: `false` (unconfirmed). `visibility: internal`, `status: alpha`, `integrationStatus: preview`, `journeyRole: growth-engine`, `journeyOrder: 3`, `nextProductIds: ["arenak"]`.

## What to retire
Not audited — if Atlas has a placeholder or ad hoc sign-in, replace it with the contracts below rather than extend it.

## Package artifacts to consume
`@avatark/auth`, `@avatark/auth-ui`, `@avatark/account`, `@avatark/account-ui`, `@avatark/product-registry`, `@avatark/organizations`, `@avatark/bootstrap`.

## Required adapter
`AccountAdapters` against Atlas's own Supabase project. Projects/sources/research-access data belongs in `ExtensionAdapter`s.

## Product identity configuration
From `getProductIdentityConfig("atlas")`:
- `signInContext`: "You will return to Atlas to continue your project or research."
- `defaultReturnPath`: `/`
- `allowedLocalRoutePrefixes`: `/`, `/projects`
- `privacyNote`: "Signing in does not grant access to research or projects you have not been given access to."
- `deploymentStatus`: live · `integrationStatus`: pending_shared_identity · `accessState`: entitlement_dependent

## Product extension sections
`projects`, `sources`, `research-access`.

## Entitlement / organization concerns
Research organizations (`docs/ORGANIZATION_CONTEXT.md`'s "Research organization" example) are directly relevant — a user's role/entitlement on a given Atlas project is plausibly organization-scoped, not global. `research-access` should be modeled as an entitlement with `source: research_enrollment` (`docs/MEMBERSHIP_ENTITLEMENT_AUTHORIZATION.md`), not a plan tier.

## Environment variables
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.

## Supabase Redirect URL entries
`https://atlas.dt4i.ai/auth/callback`.

## Manual verification
Not exercisable from this repo without inspecting `atlas-web` directly. Once wired: Google/magic-link flows, Account rendering, `projects`/`sources`/`research-access` extension tabs.

## Rollback plan
No shared-package API changed by this session breaks a pre-existing Atlas integration — none is confirmed to exist yet.

## Backward-compatible routes
Not audited — treat existing Atlas routes as backward-compatible by default until confirmed otherwise.
