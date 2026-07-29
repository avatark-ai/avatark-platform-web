# Shared Platform Migration Readiness

Status: verification-state documentation only. No migration was run and no
database was touched to produce this document — every claim below is
sourced from git history (commit messages describing verification actually
performed in a prior session) and the current contents of
`supabase/migrations/` and `supabase/scripts/run-platform-migrations.js`.

## 1. What is confirmed applied and verified

Migrations 001–009 are **confirmed applied and verified** against
`avatark-platform-test`:

| Migration | Contents | Verification evidence |
|---|---|---|
| `001_extensions.sql` | Postgres extensions | Commit `f28d8a3` |
| `002_profiles.sql` | `profiles` table | Commit `f28d8a3`: schema inspection confirmed the table exists post-apply |
| `003_account_preferences.sql` | `account_preferences` table | Commit `f28d8a3` |
| `004_privacy_settings.sql` | `privacy_settings` table | Commit `f28d8a3` |
| `005_rls.sql` | RLS policies on all three tables above | Commit `f28d8a3`: "real policies (5, matching design)" confirmed by direct post-apply query |
| `006_auth_bootstrap.sql` | `handle_new_platform_user()` trigger + `updated_at` triggers | Commit `f28d8a3`: "real triggers (4, including the auth-bootstrap trigger correctly attached to auth.users)" |
| `007_grants.sql` | Table grants to `authenticated` | Commit `f28d8a3`: added specifically because a real two-user RLS isolation test failed with "permission denied for table profiles" before this migration existed; re-tested and passed after |
| `008_privacy_consent_columns.sql` | Consent columns on `privacy_settings` | Commit `c3a6dfb`: "Real, live verification performed against avatark-platform-test... fresh privacy_settings rows confirmed to genuinely default to false on all three new columns" |
| `009_privacy_bootstrap_fix.sql` | Trigger fix + backfill for `privacy_settings` | Commit `c3a6dfb`: same verification pass, plus a real two-user RLS isolation re-test |

Also confirmed by commit `c3a6dfb`: a full re-run of migrations 001–009
was replay-confirmed idempotent (checksum-match skip), and a real two-user
RLS isolation test passed against `avatark-platform-test` (User A sees
exactly one row in `profiles` and `account_preferences` — their own,
never User B's).

**This is what backs AUTHENTICATION READY** in
`docs/AVATARK_SHARED_PLATFORM_ARCHITECTURE.md` §2 — real, live-verified
sign-in, profile bootstrap, preferences, and privacy/consent storage.

## 2. What is authored only, not yet verified

Migrations 010–016 are present in `supabase/migrations/`, are correctly
listed (as of commit `49f3a80`) in
`supabase/scripts/run-platform-migrations.js`'s `MIGRATION_ORDER`, and
define real, reviewed schema — but **have never been run against any live
database, including `avatark-platform-test` itself.**

| Migration | Contents |
|---|---|
| `010_organizations.sql` | `organizations`, `organization_members` |
| `011_platform_roles.sql` | `platform_roles` |
| `012_product_access.sql` | `product_access` |
| `013_platform_audit_events.sql` | `platform_audit_events` |
| `014_admin_rls.sql` | RLS for all of the above |
| `015_admin_grants.sql` | Grants for all of the above |
| `016_organization_invitations.sql` | `organization_invitations` |

Evidence that these remain unverified:

- `docs/PLATFORM_COMPLETION_CHECKPOINT.md:39`: "Still not run anywhere: no
  `PLATFORM_DATABASE_URL`..."
- Commit `a57d4a4` (Wave 2A, the session that wired `lib/identity/claims.ts`
  to read these tables): "tests 102/102 (+2, exercising loadIdentityExtras
  against fixture rows **since no environment here has a live migrated
  database or an authenticated session to check against end-to-end**)."
- `supabase/scripts/run-platform-migrations.js:24-28`: the runner still
  refuses to run at all without `PLATFORM_DATABASE_URL` set, and that
  variable does not appear in `.env.local`, `.env.example`, or any Vercel
  configuration reachable from this repo.
- Commit `49f3a80`'s own message: this session only fixed the *runner's
  migration list* (which had drifted and stopped at `009`) so that 010–016
  *could* be applied in the future — it does not claim they were.

**This is what backs PLATFORM AUTHORIZATION READY** in the architecture
doc — and it is not yet true. Every consumer of `organization_members`,
`platform_roles`, or `product_access` (this repo's own
`lib/identity/claims.ts`, `lib/account/adapters.ts`'s membership fields,
`lib/admin/authz.ts`) is reading against a live schema whose existence in
`avatark-platform-test` has not been independently confirmed — only
designed, authored, and unit-tested against fixture data.

## 3. Consequence for GameK

- GameK sign-in (magic link, Google OAuth, session, sign-out) depends only
  on §1's confirmed-verified migrations plus Supabase Auth itself — **may
  be configured now**, independent of §2.
- GameK product-access checks (is this user entitled to GameK), role/admin
  authorization, and organization membership all depend on §2's
  unverified migrations. **Must not be described as complete or working
  until 010–016 are actually applied to `avatark-platform-test` and
  re-verified the same way 001–009 were** (schema inspection + a real
  RLS isolation test with two distinct users, not just successful
  `CREATE TABLE` output).

## 4. What verifying 010–016 would require

Not performed in this task — no `PLATFORM_DATABASE_URL` is configured in
any environment reachable from this repo, and provisioning one is outside
this task's scope (documentation only, no production/database
configuration). For whoever picks this up next:

1. Obtain a `PLATFORM_DATABASE_URL` connection string for
   `avatark-platform-test` (same project 001–009 were verified against —
   see the environment matrix for the evidence tying this project to that
   ref).
2. Run `node supabase/scripts/run-platform-migrations.js` with that URL
   set. The script's own `FORBIDDEN_PROJECT_REFS` guard
   (`supabase/scripts/run-platform-migrations.js:17-21`) will refuse to run
   if pointed at PrometheusK-prod, `prometheusk-test`, or the legacy
   AvatarK project by mistake — leave that guard in place.
3. Confirm success the same way 001–009 were confirmed, not by trusting
   the script's own "OK" output alone: direct schema inspection (tables,
   RLS flags, policy count, grants) plus a real two-user isolation test
   against `organization_members`/`platform_roles`/`product_access`.
4. Only after that passes, update this document and
   `docs/AVATARK_SHARED_PLATFORM_ARCHITECTURE.md` §2 to move
   10–016/PLATFORM AUTHORIZATION READY from "authored, unverified" to
   "applied, verified," with the same kind of evidence recorded here for
   001–009.
