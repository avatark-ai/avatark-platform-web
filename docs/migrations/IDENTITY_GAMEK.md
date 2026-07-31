# Identity Migration — GameK (`gamek-web`)

Restructures `docs/MIGRATION_GAMEK.md` (RC3/RC4 bootstrap guidance, still valid) onto the mission's required template, adding the new canonical identity/account packages (`@avatark/auth-ui`, `@avatark/account`, Part 4 identity config). This repo has no access to `gamek-web`'s source — facts below are either cited from this repo's doc corpus or generic contract guidance, not a verified audit.

## Repository / path
`gamek-web` (sibling repo, not inspectable from here). Domain: `https://gamek.ai`. Sub-experiences: FlowK/PathK/GeometriK/ChronicleK.

## Current implementation
GameK is the **most-integrated non-Avatar product today**: `supportsAuth`, `supportsAccount`, `supportsNavigation`, `supportsInvitations` are all `true` in `PRODUCT_REGISTRY` — Shared Auth, Shared Account, Product Context, Avatar Menu, My Journey deep-link, and Arena Invitation handoff are already confirmed live (`docs/PLATFORM_INTEGRATION_MATRIX.md`). GameK consumes a copy of the **vendored** `@avatark/account` tarball — the same one this repo just retired in favor of the local `packages/account` source (`docs/CANONICAL_ACCOUNT_SHELL.md`).

## What to retire
1. GameK's own copy of the `@avatark/account` vendored tarball — replace with this repo's `packages/account` (now the canonical source; PrometheusK's former copy is being retired the same way — see `IDENTITY_PROMETHEUSK.md`).
2. GameK's current sign-in UI, if it predates `@avatark/auth-ui` — replace with `AuthShell`/`SignInCard` composition (`docs/CANONICAL_AUTH_UI.md`).
3. **Confirmed real defect**: GameK's `ProfileAdapter` reads/writes `auth.users.user_metadata`, while this repo's canonical mapping is `public.profiles` (`docs/SHARED_PROFILE_SOURCE_OF_TRUTH.md`). Fix this regardless of the package migration below — it silently diverges Account data between repos today.
4. Any hand-rolled cross-product URL building for Product Context/Arena handoff, in favor of `@avatark/navigation`.

## Package artifacts to consume
`@avatark/auth`, `@avatark/auth-ui`, `@avatark/account`, `@avatark/account-ui`, `@avatark/product-registry`, `@avatark/membership`, `@avatark/organizations`, `@avatark/notifications`, `@avatark/bootstrap` (for `bootstrapProduct("gamek", {...})`).

## Required adapter
Implement `AccountAdapters` (`packages/account/src/contracts/adapters.ts`) against GameK's real Supabase project and `public.profiles` table. GameK's own game-specific data (world progress, FlowK/PathK/GeometriK/ChronicleK state) must **not** live inside `ProfileAdapter`/`MembershipAdapter` — register it as `ExtensionAdapter`s instead (see below).

## Product identity configuration
From `getProductIdentityConfig("gamek")` (`packages/product-registry/src/identityConfig.ts`):
- `signInContext`: "You will return to GameK when sign-in is complete."
- `defaultReturnPath`: `/`
- `allowedLocalRoutePrefixes`: `/`, `/flowk`, `/pathk`, `/geometrik`, `/chroniclek`, `/journey`
- `privacyNote`: "Signing in does not share your game progress with other products beyond confirmed platform integrations."
- `deploymentStatus`: live · `integrationStatus`: live · `accessState`: available

## Product extension sections
Register via `ExtensionAdapter` (`docs/ACCOUNT_EXTENSION_CONTRACT.md`): `game-profile`, `navigator`, `world-progress` (mission Part 10's exact list for GameK). Do not add a fourth "controller connections" extension until that feature is real.

## Entitlement / organization concerns
GameK is `accessState: available` — no entitlement gate for the base game itself. Organization context is not required for GameK's core experience; only relevant if/when cohort or classroom-style GameK usage is built.

## Environment variables
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` is **not** required by the new packages — `@avatark/auth-ui` uses live provider-capability detection instead (`docs/CANONICAL_AUTH_UI.md`). Confirm GameK's own capability-probe implementation exists (mirroring `lib/auth/authProviderCapabilities.ts`) before removing any static flag.

## Supabase Redirect URL entries
Add `https://gamek.ai/auth/callback` (and GameK's confirmed preview domain, if one exists) to GameK's own Supabase project's Auth → URL Configuration → Redirect URLs. GameK is presumed to already share AvatarK's identity project per `supportsAuth: true` — confirm this, since if GameK instead runs its own separate Supabase project, "shared identity" is not actually true today and needs its own resolution before this guide's UI-only changes mean anything.

## Manual verification
1. Google sign-in end-to-end (button appears only when GameK's own capability probe reports `enabled`).
2. Magic-link send → email → callback → lands on `defaultReturnPath` or the requested `return` path (must satisfy `allowedLocalRoutePrefixes`).
3. Account → Profile/Products/Membership/Preferences/Security/Data & Export all render without duplicate "Account" nav and without the "0"/"A" unlabeled-chip issue (fixed upstream in `@avatark/account-ui`).
4. GameK extension tabs (`game-profile`, `navigator`, `world-progress`) render real data, not placeholders.

## Rollback plan
Revert the `@avatark/account`/`@avatark/auth-ui` dependency bump; GameK's prior tarball-based Account and hand-rolled sign-in UI continue working unmodified, since no shared-package API was broken (this repo preserved `@avatark/account`'s public API — see `packages/account/PROVENANCE.md`).

## Backward-compatible routes
GameK's existing `/flowk`, `/pathk`, `/geometrik`, `/chroniclek`, and My Journey deep-link routes are unaffected by this migration — only the Account/Auth UI composition and adapter wiring change, not GameK's own route structure.
