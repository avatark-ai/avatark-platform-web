# Identity Migration — SetpointK

Net-new migration guide. SetpointK.ai is **live on DNS today**, same non-conflation rule as CinemaK: live deployment must never be reported as "coming soon" merely because shared-identity integration is incomplete.

## Repository / path
No local repository found in this workspace (`PRODUCT_REGISTRY`'s `setpointk.repository: null`). Domain: `https://setpointk.ai`.

## Current implementation
`status: internal` (the most restrictive status value in the registry), `visibility: internal`, no `integrationStatus` set. **Historically backed by its own Cognito auth** — not Supabase, not this ecosystem's shared identity at all (per the registry entry's own description).

## What to retire
SetpointK's Cognito-based auth is **not required to be retired by this guide**. Migrating physiological/health-adjacent identity infrastructure is a decision with real compliance weight — this document names the target contract; it does not mandate an immediate cutover.

## Package artifacts to consume
`@avatark/auth`, `@avatark/auth-ui`, `@avatark/account`, `@avatark/account-ui`, `@avatark/product-registry`, `@avatark/organizations`, `@avatark/bootstrap` — once/if SetpointK adopts shared identity. Until then, these are target contracts, not an in-progress migration.

## Required adapter
If adopted: `AccountAdapters` against a real identity provider (Cognito bridged to Supabase, or a genuine migration to Supabase). Physiological data must **never** flow through `ProfileAdapter`/`MembershipAdapter` — it belongs entirely behind the dedicated sensitive-data extension slots below, each gated by SetpointK's own consent check before any data is returned.

## Product identity configuration
From `getProductIdentityConfig("setpointk")`:
- `signInContext`: "You will return to SetpointK to continue with your authorized physiological data experience."
- `defaultReturnPath`: `/`
- `allowedLocalRoutePrefixes`: `/`, `/spi`
- `privacyNote`: "Signing in never implies permission to view another person's physiological or health-adjacent data. Access requires explicit entitlement and consent."
- `deploymentStatus`: **live** (DNS reachable) · `integrationStatus`: pending_shared_identity · `accessState`: **entitlement_and_consent_required** (the strictest access state in the mission's vocabulary — distinct from every other product's `available`/`entitlement_dependent`)

## Dedicated sensitive-data and consent section (mandatory for SetpointK)

This is the one migration guide the mission requires to carry its own dedicated section, per Part 18's explicit instruction. Non-negotiable rules:

1. **Signing in must never imply permission to view another person's physiological or health-adjacent data.** Every read of `physiological-profile`, `spi`, `measurements-and-biomarkers`, or `personal-baseline` must independently check consent — not derive it from `accessState: active` alone.
2. **Consent is not a UI toggle that silently no-ops.** `consent-and-data-sharing` (the extension slot) must be backed by a real, checkable consent record before any other SetpointK extension slot returns data referencing another person (e.g. a care-team member viewing a patient's SPI).
3. **`care-team-connections` is the one extension slot explicitly about a *different* person's data** — it must resolve through an explicit, revocable care-relationship grant (`EntitlementSource: care_relationship`, `docs/MEMBERSHIP_ENTITLEMENT_AUTHORIZATION.md`), never inferred from organization membership alone.
4. **`research-participation`** must be opt-in per study, not a single global flag — mirrors `docs/NOTIFICATION_PREFERENCES.md`'s `research_participation` category, which is itself only shown "where applicable."
5. **Do not invent legal guarantees.** Retention/consent/clinical obligations are policy-dependent (`docs/PRIVACY_DATA_CONTROL_MODEL.md`) — this guide names the contract shape, not a compliance certification.

## Product extension sections
`physiological-profile`, `spi`, `connected-data-sources`, `measurements-and-biomarkers`, `personal-baseline`, `consent-and-data-sharing`, `research-participation`, `care-team-connections` — all eight, per mission Part 10's exact list for SetpointK.

## Entitlement / organization concerns
`accessState: entitlement_and_consent_required` is the strictest in the ecosystem — default-deny (`resolveCapability`) is not optional here, it is the floor. Care organizations (`docs/ORGANIZATION_CONTEXT.md`'s "Clinic or care organization" example) are the primary organization type relevant to `care-team-connections`.

## Environment variables
Unconfirmed — SetpointK's real environment (Cognito-based today) is not this repo's to specify. If/when a Supabase-backed identity is adopted: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.

## Supabase Redirect URL entries
Not applicable while SetpointK remains Cognito-backed. `https://setpointk.ai/auth/callback` only once/if a Supabase-backed identity mount is adopted.

## Manual verification
Not exercisable from this repo. If adopted: verify specifically that `care-team-connections` and `consent-and-data-sharing` refuse data access absent an explicit, checkable consent/relationship record — this is the one verification step more important than the generic Google/magic-link checks every other guide lists first.

## Rollback plan
No existing SetpointK auth is displaced by this document — it names a target, it does not perform a migration.

## Backward-compatible routes
Not applicable — no routes are changed by this guide.
