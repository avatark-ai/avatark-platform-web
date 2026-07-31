# Safe Diagnostics (AvatarK Identity RC1, Part 14)

Three-tier visibility contract layered on top of the existing admin check, not a replacement for it. `lib/admin/authz.ts`'s `getAdminContext()` still answers "is this user an admin" unchanged for every existing `app/admin/**` caller. `lib/admin/diagnosticsTiers.ts` adds the narrower question this mission needs: "which diagnostics tier may this session see."

## Tiers

| Tier | Who | May see |
|---|---|---|
| `consumer` | Everyone, including signed-out visitors (default) | Signed-in state, connected method, current product, generic system status (`operational`/`degraded`/`unavailable` only — no detail) |
| `developer` | `platform_roles.role = 'developer'` (not yet populated anywhere; the type exists for when a finer-grained role is introduced) | Product, environment (local/preview/staging/production), release version, short commit SHA, build time, sanitized database label, region, provider enablement, package versions, registry version, status summary, safe return route, current organization, membership/role/capability summary, feature-flag names |
| `platform_operations` | `platform_roles.role = 'admin'` (today's only privileged role) | Everything `developer` sees |

`resolveDiagnosticsTier(admin: AdminContext | null)` defaults to `consumer` for `null` (unauthenticated) and for any unrecognized role value — default deny, per the mission's requirement that privileged capabilities default to denied when entitlement is unknown.

## What backs the developer/platform-ops payload

Nothing here is reimplemented — it's a typed aggregation of what already exists and is already tested:
- `lib/admin/environment.ts` → environment name/health
- `lib/admin/authDiagnostics.ts` → Supabase/Google/magic-link/callback config presence
- `lib/admin/emailDiagnostics.ts` → Resend/SMTP/domain/template config presence

None of these three files were modified. `diagnosticsTiers.ts` only adds the tier-resolution function and the `DeveloperDiagnostics` shape a caller composes from their existing outputs.

## Copy safe diagnostics

`buildSafeDiagnosticsCopy(data: Record<string, unknown>): string` — an allowlist filter, not a trust-the-caller pass-through. It strips any key matching `token|secret|refresh|cookie|jwt|service.?role|password|key$` (case-insensitive) and any *value* that looks like a JWT (`eyJ...`), a Postgres connection string, or a `service_role`/`sk_`-prefixed credential, regardless of what key it was stored under. Verified in `lib/admin/diagnosticsTiers.test.ts` against a fixture that deliberately includes an access token, refresh token, service-role key, raw cookie header, and full database URL — none of them survive.

This never expose: access tokens, refresh tokens, raw cookies, JWT contents, service-role keys, client secrets, full database URLs, private project credentials — matching the mission's explicit exclusion list.

## Environment badges

`environment.ts`'s `currentEnvName()` already prefers `VERCEL_ENV` (authoritative Vercel build metadata) over any hostname-based inference, and reports every non-current environment as `unknown` rather than guessing — this was true before this phase and is unchanged.

## Non-goals

This phase does not wire `app/admin/**` UI to the new tiers, does not add a `developer` role to any real user, and does not add a new database table. It defines the contract and logic layer only.
