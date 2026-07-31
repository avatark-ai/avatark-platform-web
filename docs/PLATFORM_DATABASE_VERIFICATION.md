# Platform database verification — migrations 010–016

## Scope

Migrations `010_organizations.sql` through `016_organization_invitations.sql`:
organizations, organization members, platform roles, product access,
platform audit events, admin RLS, admin grants, organization invitations.

## What was and wasn't available

No credential to the real `avatark-platform-test` Supabase project's Postgres
instance exists in this environment (no `SUPABASE_SERVICE_ROLE_KEY`, no
direct `DATABASE_URL` for that project, no Supabase CLI/access token — the
only local `DATABASE_URL` present belongs to an unrelated project). That
means the live project's actual current schema state, migration history
(`supabase_migrations.schema_migrations`), and any drift from these files
**could not be inspected and remain unverified.** This is a real gap, not
assumed away — see "Not verified" below.

What *was* available: a disposable local Postgres 16 container (via Docker,
destroyed after this verification), with a minimal, faithful stand-in for
the parts of a Supabase project these migrations actually depend on — an
`auth` schema with a bare `auth.users` table, the standard `anon` /
`authenticated` / `service_role` roles, and `auth.uid()` defined exactly as
Supabase itself defines it (reading the `request.jwt.claims` GUC the way
PostgREST sets it per request). The 16 migration files were run **verbatim,
unmodified** against this stand-in.

## What was verified

**1. Clean apply, in order.** All 16 files (`001` through `016`, the full
chain — 010–016 depend on tables/extensions the earlier ones create) applied
with zero errors, first pass.

**2. Idempotency.** All 16 files were re-applied a second time, back to
back, with zero errors. Every `CREATE TABLE`/`CREATE POLICY`/`CREATE
TRIGGER`/`CREATE FUNCTION` is guarded (`IF NOT EXISTS`, `DROP ... IF EXISTS`
before recreate, or `CREATE OR REPLACE`) — safe to re-run.

**3. RLS + grants, exercised with real role/JWT simulation, not just read.**
Fixtures: two ordinary users (A, B), a third user holding a `platform_roles`
row with `role = 'admin'`, an organization only user A belongs to, and a
`product_access` grant only for user A. Each test below ran as the
`authenticated` Postgres role with `request.jwt.claims` set to that user's
`sub`, exactly as PostgREST does per-request:

| Test | Result |
|---|---|
| User A reads their own org / product_access / membership row | Visible (1 row each), as expected |
| User B (no membership, no grant) reads the same tables | Zero rows — **cross-user isolation confirmed** |
| Admin-role user reads orgs via their own `authenticated` JWT (not the service-role client) | **Zero rows** — proves `platform_roles.role = 'admin'` grants **no RLS-level bypass**. Admin visibility is only real through `lib/supabase/admin.ts`'s service-role client server-side; there is no admin carve-out in the RLS policies themselves. This is the one finding worth flagging explicitly: it's correct-by-design per the migrations' own comments, but it means any future code that expects "admin JWT → sees everything via the browser/anon-key client" is wrong. |
| Admin-role user reads their own `platform_roles` row | Visible (1 row) — same owner-only policy as everyone else |
| `authenticated` (any user) reads `platform_audit_events` | `permission denied for table platform_audit_events` — confirmed default-deny, no policy exists at all |
| `authenticated` (org member) reads `organization_invitations` | `permission denied for table organization_invitations` — confirmed default-deny |
| User A attempts to `INSERT` a new `product_access` row for themself directly (bypassing the admin backend) | `permission denied for table product_access` — **unauthorized product-access mutation is denied**, at the GRANT level (only `SELECT` is granted to `authenticated`), not merely filtered by RLS |
| User A attempts to `INSERT` a new `organizations` row directly | `permission denied for table organizations` — same denial pattern |
| `service_role` (the real admin backend's role) | Sees all rows in `organizations` and can read the empty `platform_audit_events` table — confirms the intended admin path actually works |
| `anon` (unauthenticated) reads `organizations` | `permission denied for table organizations` — no anon access anywhere in this migration range |

Every row in this table reflects an actual query result against the running
migrations, not an inference from reading the SQL.

## Not verified (explicitly out of scope of this pass)

- Whether these 16 migrations have actually been applied, in this exact
  form, to the real `avatark-platform-test` project today, or whether any
  drift exists between that project's live schema and these files.
- Real Supabase-issued JWTs, real `service_role` key behavior, and Supabase
  Auth's own trigger/webhook timing in production — the local `auth.users`
  stand-in only reproduces the one column (`id`, plus `email` for the
  bootstrap trigger) these migrations actually touch, not Supabase's real
  `auth.users` schema.
- Anything about migrations 001–009 beyond "they apply and don't block
  010–016" — they were run only as a prerequisite chain, not independently
  re-audited in this pass.

## Verdict

**Do not read this as "PLATFORM AUTHORIZATION READY."** The SQL is
internally consistent, idempotent, and behaves exactly as its own comments
claim when exercised with real RLS enforcement and real cross-user
isolation tests — that much is now demonstrated, not assumed. Whether the
live Supabase project matches these files is unverified and requires
Supabase dashboard/Management API or direct Postgres credentials this
environment does not have. **BLOCKED_MANUAL_CONFIGURATION** for: confirming
live-project migration state, confirming no manual dashboard drift (e.g. an
RLS policy edited directly in the Supabase UI), and testing against real
Supabase-issued sessions end-to-end.
