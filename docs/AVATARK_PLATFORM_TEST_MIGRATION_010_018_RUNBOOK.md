# avatark-platform-test — Manual Migration Runbook: 010 → 018

**Scope:** apply migrations `010_organizations.sql` through
`018_account_preferences_rc11.sql` to the `avatark-platform-test` Supabase
project, and record them in `public.schema_migrations` using the exact
ledger format already established by `supabase/scripts/run-platform-migrations.js`
and populated (for 001–009) on this database.

**Confirmed starting state** (from `public.schema_migrations` on
avatark-platform-test, per live query): `001` through `009` are applied.
`010` onward are not applied. No UI or application code is touched by this
runbook — SQL only, against this one database.

**Out of scope:** `001`–`009` (already applied, not re-touched), `019`
(`avatar_storage.sql`), `020` (`capability_grants.sql`). Those two are real
files on disk but were explicitly excluded from this pass; they depend only
on tables this runbook creates (020 has no FK to 010–018 at all; 019 is
storage-schema-only) and are unaffected by stopping at 018.

---

## 1. Files audited

| # | File | Creates / alters | Depends on |
|---|------|-------------------|------------|
| 010 | `010_organizations.sql` | `organizations`, `organization_members` (+1 index) | `auth.users` (001–009) |
| 011 | `011_platform_roles.sql` | `platform_roles` | `auth.users` |
| 012 | `012_product_access.sql` | `product_access` (+1 index) | `auth.users` |
| 013 | `013_platform_audit_events.sql` | `platform_audit_events` (+3 indexes) | `auth.users` |
| 014 | `014_admin_rls.sql` | RLS + 4 policies on the tables from 010–013 | 010, 011, 012, 013 |
| 015 | `015_admin_grants.sql` | GRANTs on the tables from 010–013 | 010, 011, 012, 013 |
| 016 | `016_organization_invitations.sql` | `organization_invitations` (+2 indexes), RLS, grants | 010 (`organizations` FK) |
| 017 | `017_profile_role_org_location.sql` | adds `role`, `organization`, `location` to `profiles` | 002 (`profiles`, already applied) |
| 018 | `018_account_preferences_rc11.sql` | adds `notification_category_prefs`, `current_organization_id`, `reduced_motion` to `account_preferences` | 003 (`account_preferences`, already applied) **and** 010 (`organizations` FK) |

## 2. Dependency order

The on-disk numeric order (010→018) is already a valid topological order —
no reordering is required. The two dependencies that matter and that this
order satisfies:

- **014, 015, 016 → 010–013**: RLS, grants, and invitations all reference
  tables created in 010–013. Running 014/015/016 before 010–013 would fail
  outright (`relation "organizations" does not exist`).
- **018 → 010**: `account_preferences.current_organization_id` is a foreign
  key to `organizations(id)`. Running 018 before 010 would fail
  (`relation "organizations" does not exist`).
- **017, 018 → 002, 003**: both `ALTER TABLE` onto tables from earlier,
  already-applied migrations. Already satisfied by the confirmed starting
  state.

There is no dependency forcing 017/018 to come after 016 specifically, or
011/012/013 into any particular order relative to each other — the numeric
order is simply the order the checkpoint assigned them, and this runbook
preserves it exactly (matching `MIGRATION_ORDER` in
`supabase/scripts/run-platform-migrations.js`).

## 3. Audit findings

**Idempotency — all 9 files are safe to re-run.** Every statement uses an
idempotent form:

- `CREATE TABLE IF NOT EXISTS` (010, 011, 012, 013, 016)
- `CREATE INDEX IF NOT EXISTS` / `CREATE UNIQUE INDEX IF NOT EXISTS` (010, 012, 013, 016)
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` — re-enabling already-enabled RLS is a no-op, not an error (014, 016)
- `DROP POLICY IF EXISTS` immediately followed by `CREATE POLICY` (014)
- `GRANT ...` — re-granting an already-held privilege is a no-op in Postgres, never an error (015, 016)
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (017, 018)

None of the 9 files is destructive: no `DROP TABLE`, no `DROP COLUMN`, no
`TRUNCATE`, no `DELETE`, no data rewrite. **Answering requirement 6
directly: every migration in this range is safely re-runnable as authored.**
The one non-idempotent element in this whole operation is not in the
migration files themselves but in the *ledger insert* — see below.

**Data-loss risk: none.** 017 and 018 both add columns to tables
(`profiles`, `account_preferences`) that already hold real rows (confirmed
by 006/009's own bootstrap-trigger history — every signed-up user gets a
`profiles` and `account_preferences` row). Both migrations add columns with
either a `NOT NULL DEFAULT` or a nullable type and no default:

- 017: `role`, `organization`, `location` — all nullable, no default. Existing rows get `NULL`.
- 018: `notification_category_prefs jsonb NOT NULL DEFAULT '{}'::jsonb`, `current_organization_id uuid` (nullable, FK), `reduced_motion boolean NOT NULL DEFAULT false`.

Adding a column with a constant default (PostgreSQL 11+) is a metadata-only
operation — it does not rewrite the table or lock it for the row count
involved here. No backfill step is required or present.

**Name collisions: none.** Grepped 001–009 and 010–018 for reuse — no table,
policy, or index name is defined twice. `organizations`,
`organization_members`, `platform_roles`, `product_access`,
`platform_audit_events`, `organization_invitations` are all new names.

**Duplicate grants / duplicate indexes: none found**, and none would be
created even on a re-run — `GRANT` and `CREATE INDEX IF NOT EXISTS` do not
accumulate duplicates in Postgres.

**Foreign-key dependencies**, all confirmed satisfiable at execution time:
`organization_members.user_id`, `platform_roles.user_id`,
`platform_roles.granted_by`, `product_access.user_id`,
`product_access.granted_by`, `platform_audit_events.actor_id`,
`organization_invitations.invited_by` → `auth.users(id)` (pre-existing,
managed by Supabase Auth, not created by this repo). `organization_members.org_id`,
`organization_invitations.org_id` → `organizations(id)` (created by 010,
earlier in this same bundle). `account_preferences.current_organization_id`
→ `organizations(id)` (created by 010, earlier in this same bundle).

**Assumptions about `auth.users`**: all 010–013/016 FK references assume
`auth.users` exists and is the Supabase-managed auth schema — true on any
Supabase project, confirmed already relied upon by the applied 001–009
(e.g. `profiles.id REFERENCES auth.users(id)` in 002). No new assumption
introduced.

**Assumptions about existing `profiles`/`account_preferences` rows**: 017
and 018 assume both tables already exist (true — 002/003 are applied) and
tolerate any number of existing rows without a backfill step, per the
data-loss analysis above.

**RLS/grant posture note (not a bug, documented for completeness):**
`platform_audit_events` and `organization_invitations` intentionally get no
`authenticated`-role policy or grant at all — default-deny, service-role-only
access, by design per each file's own header comment. This is consistent
with the mission's "no unsafe direct auth mutation without confirmation"
posture already established in 014's comments.

**The one real non-idempotent risk in this operation:** the original
runner (`run-platform-migrations.js`) inserts into `schema_migrations` with
a plain `INSERT`, which would throw a duplicate-key error on the `filename`
UNIQUE constraint if a partially-applied run were retried. Section 5's
execution block does **not** invent a new tracking format to address this
— it uses the exact same table and columns — but guards each insert with
`ON CONFLICT (filename) DO NOTHING` and wraps the entire 010–018 bundle in
one transaction, so a failure at any point rolls back everything from this
run (nothing partially lands), and the identical block can simply be
re-submitted after the underlying issue is fixed.

## 4. Pre-check (read-only — run first, confirm results before proceeding)

```sql
-- 1. Current ledger state — confirm 001–009 applied, 010+ absent.
SELECT filename, checksum, applied_at
FROM public.schema_migrations
ORDER BY filename;

-- 2. Confirm none of 010–018 are already recorded.
SELECT filename
FROM public.schema_migrations
WHERE filename IN (
  '010_organizations.sql', '011_platform_roles.sql', '012_product_access.sql',
  '013_platform_audit_events.sql', '014_admin_rls.sql', '015_admin_grants.sql',
  '016_organization_invitations.sql', '017_profile_role_org_location.sql',
  '018_account_preferences_rc11.sql'
);
-- Expected: 0 rows.

-- 3. Confirm none of the new tables already exist out-of-ledger
--    (guards against a prior partial/manual apply that never hit the ledger).
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'organizations', 'organization_members', 'platform_roles', 'product_access',
    'platform_audit_events', 'organization_invitations'
  );
-- Expected: 0 rows.

-- 4. Confirm profiles/account_preferences exist and do NOT already have
--    the columns 017/018 would add.
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('role', 'organization', 'location');

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'account_preferences'
  AND column_name IN ('notification_category_prefs', 'current_organization_id', 'reduced_motion');
-- Expected: 0 rows for both queries.

-- 5. Confirm pgcrypto is present (gen_random_uuid(), used by 010/013/016).
SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';
-- Expected: 1 row.

-- 6. Confirm the roles referenced by GRANT statements exist.
SELECT rolname FROM pg_roles WHERE rolname IN ('authenticated', 'service_role');
-- Expected: 2 rows.
```

If query 2 or 3 returns any rows, **stop** — that means some of 010–018 (or
same-named tables from an unrelated source) already exist on this database
outside the ledger, and this runbook's assumptions no longer hold. Re-audit
before proceeding.

## 5. Execution block (010 → 018, ordered, ledger-updating)

Run as a single statement/transaction, using a role with privileges to
`CREATE TABLE`, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`,
and `GRANT` (the same privileges `run-platform-migrations.js` requires —
typically the Supabase project's `postgres` role, not `service_role` or
`authenticated`).

```sql
BEGIN;

-- ============================================================
-- 010_organizations.sql
-- ============================================================
-- AvatarK Platform — Organizations
-- Minimal shape: a named org plus its members. No billing/plan fields --
-- nothing here is justified yet by a real product requirement.
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS organization_members_user_id_idx ON organization_members(user_id);

INSERT INTO public.schema_migrations (filename, checksum)
VALUES ('010_organizations.sql', 'c6be56a58a43f782717dcc8b2d421f11acff8ba9b2457331783a4b7f2a493dad')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================
-- 011_platform_roles.sql
-- ============================================================
-- AvatarK Platform — Platform Roles
-- Global (not per-product) roles. Today's only real consumer is Platform
-- Admin authorization ('admin'); the type is left as free text rather than
-- an enum since the mission anticipates more platform-level roles later
-- and a text column is the reversible choice.
CREATE TABLE IF NOT EXISTS platform_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role)
);

INSERT INTO public.schema_migrations (filename, checksum)
VALUES ('011_platform_roles.sql', '7be8a432fc98f8f9da5252ae017333b6adac108be716123fcbec7c40c5bca6a9')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================
-- 012_product_access.sql
-- ============================================================
-- AvatarK Platform — Product Access
-- Real entitlement grants, replacing the static-only productAccess adapter
-- (see lib/account/adapters.ts and lib/products/registry.ts). product_id
-- is free text, matching PlatformProduct.id in lib/products/registry.ts,
-- not a foreign key -- the registry is code-owned config, not a DB table.
CREATE TABLE IF NOT EXISTS product_access (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS product_access_product_id_idx ON product_access(product_id);

INSERT INTO public.schema_migrations (filename, checksum)
VALUES ('012_product_access.sql', 'e3f1f1a14befc5ee93287b66aee7ea83a98b3bebc54fba1b421e428a0b431368')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================
-- 013_platform_audit_events.sql
-- ============================================================
-- AvatarK Platform — Audit Events
-- actor/action/target/timestamp/environment/result, per the Platform Admin
-- mission spec. Written only by server-side admin code paths using the
-- service-role client (RLS below intentionally grants no INSERT policy to
-- `authenticated` -- service_role bypasses RLS entirely, which is the only
-- intended writer).
CREATE TABLE IF NOT EXISTS platform_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  environment text NOT NULL,
  result text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_audit_events_actor_id_idx ON platform_audit_events(actor_id);
CREATE INDEX IF NOT EXISTS platform_audit_events_target_id_idx ON platform_audit_events(target_id);
CREATE INDEX IF NOT EXISTS platform_audit_events_created_at_idx ON platform_audit_events(created_at DESC);

INSERT INTO public.schema_migrations (filename, checksum)
VALUES ('013_platform_audit_events.sql', '625b89c074af2d6d0c499665b5dc752e8f9b6e45e788aeb305772fcdb010ba32')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================
-- 014_admin_rls.sql
-- ============================================================
-- AvatarK Platform — RLS for organizations/roles/product-access/audit
-- Read-only for `authenticated` and scoped to the caller's own rows/orgs.
-- All writes (org creation, role grants, product-access grants, audit
-- inserts) go through the service-role admin client from Platform Admin
-- server code -- no INSERT/UPDATE/DELETE policy exists for `authenticated`
-- on any of these tables. That is deliberate, not an oversight: the
-- mission explicitly calls for "no unsafe direct auth mutation without
-- confirmation," and no confirmation UI exists yet.

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select_member" ON organizations;
CREATE POLICY "organizations_select_member" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "organization_members_select_own" ON organization_members;
CREATE POLICY "organization_members_select_own" ON organization_members
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "platform_roles_select_own" ON platform_roles;
CREATE POLICY "platform_roles_select_own" ON platform_roles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "product_access_select_own" ON product_access;
CREATE POLICY "product_access_select_own" ON product_access
  FOR SELECT USING (user_id = auth.uid());

-- No policy at all for platform_audit_events: it is not exposed to
-- `authenticated` in any form (not even the actor's own events), since
-- default-deny is the correct posture for an audit log. Only the
-- service-role admin client (which bypasses RLS) can read or write it.

INSERT INTO public.schema_migrations (filename, checksum)
VALUES ('014_admin_rls.sql', 'b8f5d8aa04e98990c02739547374e6612ffcbfc687197fca5515ddd256489070')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================
-- 015_admin_grants.sql
-- ============================================================
-- AvatarK Platform — Table Grants for organizations/roles/product-access/audit
-- Same real gap as 007_grants.sql: RLS policies restrict a permitted
-- operation, they don't grant permission. Explicit here rather than
-- assumed, for the same reason 007 was explicit.

GRANT SELECT ON organizations TO authenticated;
GRANT SELECT ON organization_members TO authenticated;
GRANT SELECT ON platform_roles TO authenticated;
GRANT SELECT ON product_access TO authenticated;
-- No grant at all to `authenticated` on platform_audit_events -- it is
-- unreachable via the anon/authenticated (RLS-governed) client, full stop.

-- Explicit service-role grants: this repo's admin surfaces read and write
-- these tables exclusively through lib/supabase/admin.ts's service-role
-- client, which bypasses RLS but still needs standard table privileges.
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON product_access TO service_role;
GRANT SELECT, INSERT ON platform_audit_events TO service_role;

INSERT INTO public.schema_migrations (filename, checksum)
VALUES ('015_admin_grants.sql', '9a6ae2aef06e79bb5e2df362af7c05707bce00d81e8ea156f01601f12313ff71')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================
-- 016_organization_invitations.sql
-- ============================================================
-- AvatarK Platform — Organization Invitations
-- Pending invites to join an organization by email, before the invitee has
-- an account (or before they've accepted). Deliberately not exposed to
-- `authenticated` at all -- same default-deny posture as
-- platform_audit_events, since rows contain email addresses that
-- shouldn't be readable outside the service-role admin surface that
-- issues and revokes them.
CREATE TABLE IF NOT EXISTS organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS organization_invitations_org_id_idx ON organization_invitations(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS organization_invitations_token_idx ON organization_invitations(token);

ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
-- No policy for `authenticated` -- service-role only, matching
-- platform_audit_events' default-deny rationale in migration 014.

GRANT SELECT, INSERT, UPDATE, DELETE ON organization_invitations TO service_role;

INSERT INTO public.schema_migrations (filename, checksum)
VALUES ('016_organization_invitations.sql', 'c2a427759c6adc01f73d51c9a3727a68624584cb195cdbf6241aec9b1a2347b2')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================
-- 017_profile_role_org_location.sql
-- ============================================================
-- AvatarK Platform — Profile role/organization/location columns
-- Real fix, not a design nicety: the shared @avatark/account ProfileTab UI
-- already collects Role/Organization/Location and sends them on Save
-- (adapters.profile.update(form) with all six fields), but this table had
-- no columns to hold them, so app/api/account/profile/route.ts silently
-- dropped every save of these three fields -- a reproducible data-loss bug,
-- not a hypothetical one. profiles remains the sole canonical store for
-- these fields, same as display_name/bio/avatar_url before it.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;

INSERT INTO public.schema_migrations (filename, checksum)
VALUES ('017_profile_role_org_location.sql', '637325def728b399b06ea13bb442aab65a922a3521a9f6e5485b50ceb7161ee1')
ON CONFLICT (filename) DO NOTHING;

-- ============================================================
-- 018_account_preferences_rc11.sql
-- ============================================================
-- AvatarK Platform — Account Preferences RC1.1 additions
--
-- Two small, additive columns backing real RC1.1 account-UI sections
-- (never fabricated in-memory state):
--
-- notification_category_prefs: per-category notification preference
-- storage (Part 8). Defaults every category to enabled except the
-- mandatory 'security_account' category, which is not read from here at
-- all -- it is always on, enforced in application code, not by a stored
-- flag a user could ever flip off. This column is preference storage
-- only; it does not imply delivery infrastructure exists (see
-- lib/account/adapters.ts's notifications adapter and
-- NOTIFICATION_PREFERENCE_CATEGORY_REGISTRY for the honest distinction).
--
-- current_organization_id: which organization (if any) the user has
-- selected as their active context (Part 7). Null means Personal
-- context, the default for every existing row and every user with no
-- organization memberships.
--
-- reduced_motion: was already a rendered checkbox in the account UI before
-- this migration, but had no backing column -- toggling it silently did
-- nothing. Added here so it becomes a real, persisted preference instead
-- of a fabricated control.
ALTER TABLE account_preferences
  ADD COLUMN IF NOT EXISTS notification_category_prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS current_organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reduced_motion boolean NOT NULL DEFAULT false;

INSERT INTO public.schema_migrations (filename, checksum)
VALUES ('018_account_preferences_rc11.sql', 'dd2a0f53d142501ab96b41afb42567f9f3f5764bf8fa4e92a6a65641ee22adf4')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
```

Checksums above were computed as `sha256(fs.readFileSync(file, 'utf8'))` —
the exact method `run-platform-migrations.js` uses — against the files as
they exist in this repo at the time this runbook was written. If any of
010–018 are edited before this runbook is executed, recompute checksums
for the edited file(s) before running, or the JS runner will report
`CHECKSUM DRIFT` the next time it's pointed at this database.

## 6. Post-check (read-only — run after execution)

```sql
-- 1. Ledger now includes 010–018, in order, with no gaps.
SELECT filename, checksum, applied_at
FROM public.schema_migrations
WHERE filename IN (
  '010_organizations.sql', '011_platform_roles.sql', '012_product_access.sql',
  '013_platform_audit_events.sql', '014_admin_rls.sql', '015_admin_grants.sql',
  '016_organization_invitations.sql', '017_profile_role_org_location.sql',
  '018_account_preferences_rc11.sql'
)
ORDER BY filename;
-- Expected: exactly 9 rows, one per filename above.

-- 2. Tables exist.
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'organizations', 'organization_members', 'platform_roles', 'product_access',
    'platform_audit_events', 'organization_invitations'
  )
ORDER BY table_name;
-- Expected: 6 rows.

-- 3. New columns exist on profiles / account_preferences.
SELECT column_name, is_nullable, column_default FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('role', 'organization', 'location')
ORDER BY column_name;
-- Expected: 3 rows, all is_nullable = YES, column_default = NULL.

SELECT column_name, is_nullable, column_default FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'account_preferences'
  AND column_name IN ('notification_category_prefs', 'current_organization_id', 'reduced_motion')
ORDER BY column_name;
-- Expected: 3 rows — notification_category_prefs (NOT NULL, default '{}'::jsonb),
-- current_organization_id (nullable, no default), reduced_motion (NOT NULL, default false).

-- 4. RLS is enabled on every new/altered-for-RLS table.
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN (
  'organizations', 'organization_members', 'platform_roles', 'product_access',
  'platform_audit_events', 'organization_invitations'
)
ORDER BY relname;
-- Expected: 6 rows, relrowsecurity = true for all.

-- 5. Policies exist as expected (4 SELECT-only policies from 014; none on
--    platform_audit_events or organization_invitations, by design).
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'organizations', 'organization_members', 'platform_roles', 'product_access',
    'platform_audit_events', 'organization_invitations'
  )
ORDER BY tablename, policyname;
-- Expected: exactly 4 rows total — organizations_select_member,
-- organization_members_select_own, platform_roles_select_own,
-- product_access_select_own — all cmd = SELECT. No rows for
-- platform_audit_events or organization_invitations.

-- 6. Grants landed for both authenticated and service_role.
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'organizations', 'organization_members', 'platform_roles', 'product_access',
    'platform_audit_events', 'organization_invitations'
  )
  AND grantee IN ('authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;
-- Expected (grantee, privilege) pairs per table:
--   organizations:            authenticated/SELECT; service_role/{SELECT,INSERT,UPDATE,DELETE}
--   organization_members:     authenticated/SELECT; service_role/{SELECT,INSERT,UPDATE,DELETE}
--   platform_roles:           authenticated/SELECT; service_role/{SELECT,INSERT,UPDATE,DELETE}
--   product_access:           authenticated/SELECT; service_role/{SELECT,INSERT,UPDATE,DELETE}
--   platform_audit_events:    service_role/{SELECT,INSERT} only — no authenticated row
--   organization_invitations: service_role/{SELECT,INSERT,UPDATE,DELETE} only — no authenticated row

-- 7. Foreign keys resolve (spot-check the two cross-migration FKs).
SELECT conname, conrelid::regclass AS table_from, confrelid::regclass AS table_to
FROM pg_constraint
WHERE conname IN ('organization_members_org_id_fkey', 'account_preferences_current_organization_id_fkey')
   OR (conrelid = 'organization_invitations'::regclass AND contype = 'f')
   OR (conrelid = 'account_preferences'::regclass AND contype = 'f' AND confrelid = 'organizations'::regclass);
-- Expected: organization_members -> organizations, organization_invitations -> organizations,
-- and account_preferences -> organizations all present. (Exact constraint
-- names are Postgres-assigned; if the conname guesses above return 0 rows,
-- drop the conname filter and rely on the contype/confrelid conditions.)

-- 8. Existing rows in profiles/account_preferences were not touched destructively.
SELECT count(*) AS profiles_rows FROM profiles;
SELECT count(*) AS account_preferences_rows FROM account_preferences;
-- Expected: same counts as before execution (this operation only adds
-- columns; it does not add, remove, or modify rows).
```

## 7. Rollback guidance

**All 9 forward migrations are non-destructive** (additive tables/columns
only), so there is nothing to "undo" from a data-integrity standpoint
immediately after running Section 5 — the new tables are empty and the new
columns are unused. Rollback is realistic and safe **only in that
immediate-after window, before any application code writes to these tables
or columns.** Once real rows exist in `organizations`,
`organization_members`, `platform_roles`, `product_access`,
`platform_audit_events`, `organization_invitations`, or once any user has a
non-null `profiles.role/organization/location` or a populated
`account_preferences.notification_category_prefs/current_organization_id/reduced_motion`,
the DROP statements below become genuinely destructive and should not be
run without a backup.

Rollback must drop in **reverse dependency order** — `organization_members`
and `organization_invitations` both hold an FK into `organizations`, and
`account_preferences.current_organization_id` does too, so those must be
cleared before `organizations` itself is dropped:

```sql
BEGIN;

-- Reverse of 018: drop the FK-bearing / additive columns first.
ALTER TABLE account_preferences
  DROP COLUMN IF EXISTS notification_category_prefs,
  DROP COLUMN IF EXISTS current_organization_id,
  DROP COLUMN IF EXISTS reduced_motion;

-- Reverse of 017.
ALTER TABLE profiles
  DROP COLUMN IF EXISTS role,
  DROP COLUMN IF EXISTS organization,
  DROP COLUMN IF EXISTS location;

-- Reverse of 016 (must precede dropping organizations — FK dependency).
DROP TABLE IF EXISTS organization_invitations;

-- Reverse of 013, 012, 011 (no ordering constraint between these three).
DROP TABLE IF EXISTS platform_audit_events;
DROP TABLE IF EXISTS product_access;
DROP TABLE IF EXISTS platform_roles;

-- Reverse of 010 (organization_members before organizations — FK dependency).
-- 014/015's policies and grants are dropped automatically along with their tables.
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS organizations;

-- Reverse of the ledger entries for this range.
DELETE FROM public.schema_migrations
WHERE filename IN (
  '010_organizations.sql', '011_platform_roles.sql', '012_product_access.sql',
  '013_platform_audit_events.sql', '014_admin_rls.sql', '015_admin_grants.sql',
  '016_organization_invitations.sql', '017_profile_role_org_location.sql',
  '018_account_preferences_rc11.sql'
);

COMMIT;
```

Notes:

- 014 (RLS/policies) and 015 (grants) have no separate rollback step — both
  are attached to the tables dropped above and disappear with them.
- This rollback block is **not** part of the `run-platform-migrations.js`
  ledger convention (there is no "down" migration mechanism in this repo) —
  it is a manual, one-time undo for this specific manual run, matching the
  "safe, realistic rollback steps" requirement rather than inventing a new
  migration-down system.
- If any doubt exists about whether these tables/columns have been written
  to since Section 5 ran, take a `pg_dump` of `avatark-platform-test` (or at
  minimum `organizations`, `organization_members`, `platform_roles`,
  `product_access`, `platform_audit_events`, `organization_invitations`,
  `profiles`, `account_preferences`) before running this block.

## 8. Expected results after Section 5 completes successfully

- **Ledger:** `public.schema_migrations` has 18 rows total (9 pre-existing
  for 001–009, plus the 9 new rows for 010–018 with the checksums listed in
  Section 5), no gaps, no duplicates.
- **Tables:** 6 new tables — `organizations`, `organization_members`,
  `platform_roles`, `product_access`, `platform_audit_events`,
  `organization_invitations` — all empty (0 rows).
- **Columns:** `profiles` gains `role`, `organization`, `location` (all
  nullable text, `NULL` on every existing row). `account_preferences` gains
  `notification_category_prefs` (`jsonb NOT NULL DEFAULT '{}'`),
  `current_organization_id` (nullable `uuid`, FK to `organizations.id`,
  `NULL` on every existing row), `reduced_motion` (`boolean NOT NULL
  DEFAULT false`).
- **RLS:** enabled on all 6 new tables.
- **Policies:** 4 total — `organizations_select_member`,
  `organization_members_select_own`, `platform_roles_select_own`,
  `product_access_select_own` — each `SELECT`-only, each scoped to the
  caller's own rows/orgs. No policy on `platform_audit_events` or
  `organization_invitations` (default-deny by design).
- **Grants:** `authenticated` gets `SELECT` on `organizations`,
  `organization_members`, `platform_roles`, `product_access` only.
  `service_role` gets full CRUD on all of those plus
  `organization_invitations`, and `SELECT, INSERT` on
  `platform_audit_events`.
- **Existing data:** `profiles` and `account_preferences` row counts
  unchanged; no existing row in any table is modified in a way that loses
  data.
