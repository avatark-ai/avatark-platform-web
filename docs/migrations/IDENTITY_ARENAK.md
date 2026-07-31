# Identity Migration — ArenaK

Restructures `docs/MIGRATION_ARENAK.md` onto the mission's required template. ArenaK's real implementation lives in a separate `dt4m-os` repo's `apps/avatark-consumer` — this repo cannot inspect ArenaK's code or reach its API. Treat "what to retire" as "if your code does this, retire it," not a confirmed finding.

## Repository / path
`dt4m-os/apps/avatark-consumer` (not a sibling repo in this workspace; `PRODUCT_REGISTRY`'s `arenak.repository` is `null` for this reason). Domain: `https://arenak.ai`.

## Current implementation
ArenaK is the **owner and producer** of the Invitations contract, not a consumer (`docs/PLATFORM_CONTRACTS.md`). `supportsInvitations: true` reflects ownership here — the one product in the registry where that flag means "producer." `integrationStatus: coming-online`.

## What to retire
If ArenaK's app hand-encodes a locally-defined `Invitation`/`InvitationType`/`InvitationStatus` shape that duplicates `@avatark/invitations`, replace it. Any hardcoded URL back to AvatarK/GameK/PrometheusK/StreamK for invitation-acceptance should go through `@avatark/navigation` instead.

## Package artifacts to consume
`@avatark/auth`, `@avatark/auth-ui`, `@avatark/account`, `@avatark/account-ui`, `@avatark/invitations`, `@avatark/product-registry`, `@avatark/organizations`, `@avatark/bootstrap`.

## Required adapter
`AccountAdapters` implementation against ArenaK's own auth/session store. Invitations, challenges, events, recognition, organizer access belong in `ExtensionAdapter`s — ArenaK's core adapters should not carry invitation-issuance logic themselves (that's `@avatark/invitations`'s job, not the account shell's).

## Product identity configuration
From `getProductIdentityConfig("arenak")`:
- `signInContext`: "You will return to ArenaK to continue your invitation, event, or challenge."
- `defaultReturnPath`: `/`
- `allowedLocalRoutePrefixes`: `/`, `/invitations`, `/challenges`, `/events`
- `privacyNote`: "Signing in does not grant access to challenges, cohorts, or recognition you have not been invited to or earned."
- `deploymentStatus`: live · `integrationStatus`: pending_shared_identity · `accessState`: entitlement_dependent

## Product extension sections
`invitations`, `challenges`, `events`, `recognition`, `organizer-access`.

## Entitlement / organization concerns
Organizer access is a distinct role, not a plan tier — model it as a capability (`docs/MEMBERSHIP_ENTITLEMENT_AUTHORIZATION.md`'s `roles`/`capabilities` on `ProductAccess`), gated server-side, never inferred from UI state. ArenaK's cohorts/communities map naturally onto `@avatark/organizations`' organization-membership contract.

## Environment variables
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` — unconfirmed for ArenaK's actual environment; this repo cannot inspect `dt4m-os`.

## Supabase Redirect URL entries
`https://arenak.ai/auth/callback`, once ArenaK's own Supabase project (or shared identity project, if adopted) is confirmed.

## Manual verification
Cannot be exercised from this repo. Whoever owns `dt4m-os`'s ArenaK app should verify tokens it issues round-trip through `packages/invitations/src/localResolver.ts` (the closest available compatibility check without a reachable ArenaK API), plus Google/magic-link flows once a real environment exists.

## Rollback plan
No shared-package API is broken by adoption — revert the dependency bump if needed; ArenaK's existing invitation-issuance flow is unaffected since `@avatark/invitations`' contract is unchanged by this session's work.

## Backward-compatible routes
Unconfirmed from this repo — ArenaK's own team should treat existing public routes as backward-compatible by default.
