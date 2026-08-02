# avatark-platform-test — Manual Migration Runbook: 020 (corrected)

**Scope:** apply the corrected `020_capability_grants.sql` to the
`avatark-platform-test` Supabase project. No UI or application code is
touched by running this migration — SQL only, against this one database.

**Confirmed starting state:** `001` through `019` are applied to
`avatark-platform-test` (010–018 per
`docs/AVATARK_PLATFORM_TEST_MIGRATION_010_018_RUNBOOK.md`, 019 applied in a
separate, later pass). `020` has **never** been applied in any form — the
original file had a genuine defect (below) and was corrected in place before
ever being run against this or any other database. This runbook replaces
that runbook's own placeholder expectation of a straightforward 020 apply
with the corrected design.

**Out of scope:** 001–019 (already applied, not re-touched, not re-audited
beyond what's needed to confirm 020's dependencies). This migration does not
require re-running or modifying any of them.

---

## 1. Audit: why the original 020 was invalid, and what it sits next to

The original `020_capability_grants.sql` declared:

```sql
create table if not exists capability_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null,
  scope_type text not null default 'platform',
  scope_id text,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  primary key (user_id, capability, scope_type, scope_id)
);
```

Its own header comment stated the intended design: `scope_id` is `NULL` for
`scope_type = 'platform'` (no scoping target) and non-null for `'product'`/
`'organization'`. But `scope_id` is also a **primary-key column**, and
PostgreSQL primary-key columns are implicitly `NOT NULL` — every column in
a `PRIMARY KEY (...)` tuple gets a `NOT NULL` constraint automatically, with
no way to opt out for one column while keeping the others. A platform-scoped
row (`scope_type = 'platform', scope_id = NULL`) could **never have been
inserted**: the insert would fail with `null value in column "scope_id"
violates not-null constraint` on every attempt, for every user, forever.
This is not a hypothetical: it was confirmed directly against a real
disposable Postgres 16 instance (§8 below) before being corrected — the
original file, applied verbatim, could not accept the one grant shape
(`platform` scope) its own design most needed.

**Confirmed via `avatark-platform-test`'s own `schema_migrations` table**:
the original file was never applied anywhere — `schema_migrations` stops at
`019`. There is no ledger row, no checksum, no existing data for `020` to
collide with or migrate away from. Correcting the file in place carries zero
migration-history risk (see §9 for why "replace in place" was chosen over
"add 021").

### What already exists and authorizes access today (audited before touching schema)

- **`platform_roles` (migration 011)** is the *only* thing that currently
  authorizes Platform Admin access. `lib/admin/authz.ts`'s
  `getAdminContext()` reads a user's own `platform_roles` row (RLS-scoped,
  no service-role client needed) and returns non-null only when
  `role = 'admin'`. This migration and everything built on top of it in this
  pass **does not change that** — `getAdminContext()`'s behavior, and every
  existing admin route's authz check, is untouched.
- **`organization_members.role`** and **`product_access`** are the two
  existing granularities: an org-scoped free-text role, and "may this user
  enter this product at all" (`status: active/suspended/expired/revoked`).
  Neither expresses "which specific action may this user perform" —
  confirmed by `lib/products/accessModel.ts`'s own comment: `capabilities:
  []  // no capability-per-grant data source exists yet`. Capability grants
  fill exactly that gap; they do not replace or duplicate either table
  (mission Part 9 — kept structurally separate in this pass: no shared
  table, no shared column, no code path collapses one into the other).
- **The Access UI already has a place for this**:
  `packages/account/src/ui/AccessTab.tsx` renders a per-product
  "Capabilities" list from `ProductAccessSummary.capabilities: string[]`,
  today always empty (an honest placeholder, not fabricated). This pass
  populates it from real rows for the first time.
- **`@avatark/membership`'s `entitlement.ts`** already defines a frozen,
  pure contract function, `resolveCapability(access: ProductAccess,
  capability: string): boolean`, that default-denies and checks
  `access.capabilities.includes(capability)`. That function is **not**
  touched or replaced by this pass — this migration and its resolver
  (`lib/capabilities/resolver.ts`) are one honest way to populate the
  `capabilities` array that function already expects; they are not a second,
  competing authorization mechanism.
- **`packages/organizations/src/permissions.ts`'s
  `ORG_ROLE_CAPABILITY_REFERENCE`** and
  **`packages/product-registry/src/capabilityMatrix.ts`'s
  `EcosystemCapability`** are both unrelated, pre-existing concepts (a
  non-enforced design-reference table of org-role capabilities, and a
  product×ecosystem-integration-feature matrix respectively) — audited and
  confirmed to have no naming or data collision with `capability_grants`.
  Neither is touched by this pass.
- **No code anywhere in this repo reads or writes `capability_grants`**
  today, confirmed by the original file's own comment and a repository-wide
  search. This pass is the first real consumer — a narrowly-scoped,
  forward-compatible layer, not something RC1/RC1.1 adoption is blocked on
  (their own release-gate docs name a different, unrelated blocker: real
  authenticated-browser-session verification).

## 2. Canonical schema (corrected)

```sql
create table if not exists capability_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null,
  scope_type text not null default 'platform',
  scope_id text,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  revoked_at timestamptz,
  constraint capability_grants_scope_type_check
    check (scope_type in ('platform', 'product', 'organization')),
  constraint capability_grants_scope_id_shape_check
    check (
      (scope_type = 'platform' and scope_id is null)
      or (scope_type in ('product', 'organization') and scope_id is not null and scope_id <> '')
    )
);
```

**The fix**: a surrogate `uuid` primary key (`id`), so no column that must be
nullable (`scope_id`) is forced into `NOT NULL` by PK membership. The actual
data-shape invariant — platform ⇒ no `scope_id`, product/organization ⇒ a
real one — is enforced directly by `capability_grants_scope_id_shape_check`,
which is what should have been doing this job from the start.

**Empty-string audit (mission requirement)**: could `''` ever be a genuine
`scope_id`? No — canonical product ids (`@avatark/product-registry`) and
organization ids (`uuid` text) are both non-empty by construction. The CHECK
constraint enforces this structurally (`scope_id <> ''`), not just by
convention, so the uniqueness index's `COALESCE(scope_id, '')` sentinel
(below) can never collide with a real value.

### Uniqueness — a partial index, not a plain one

```sql
create unique index if not exists capability_grants_active_unique_idx
  on capability_grants (user_id, capability, scope_type, coalesce(scope_id, ''))
  where revoked_at is null;
```

The mission's suggested strategy (`UNIQUE INDEX ... COALESCE(scope_id,
'')`) is correct as a *shape*, but applied as a plain (non-partial) index it
would make re-granting a capability **permanently impossible after a single
revoke** — a revoked row would still occupy the unique key forever. Scoping
the index to `WHERE revoked_at IS NULL` (a partial index) fixes this: at
most one **active** grant may exist per `(user, capability, scope)` at a
time, revoked rows are excluded from the check entirely, and a fresh grant
can always be issued after a revoke. This is verified directly in §8.

### Indexes

```sql
create index if not exists capability_grants_user_capability_idx
  on capability_grants (user_id, capability);

create index if not exists capability_grants_scope_idx
  on capability_grants (scope_type, scope_id);
```

`(user_id, capability)` serves both "resolve one user's grants for a
capability" (the resolver's actual query) and "list every grant for a
user" (admin lookup, via the leftmost-prefix rule — no separate `user_id`-
only index is added). `(scope_type, scope_id)` serves "who holds capability
X in organization Y"-style admin/reporting queries, unchanged from the
original design.

### RLS and grants (unchanged posture from the original design)

```sql
alter table capability_grants enable row level security;

drop policy if exists "capability_grants_select_own" on capability_grants;
create policy "capability_grants_select_own" on capability_grants
  for select using (user_id = auth.uid());

grant select on capability_grants to authenticated;
grant select, insert, update, delete on capability_grants to service_role;
```

Owner-only read for `authenticated`, no INSERT/UPDATE/DELETE policy for
`authenticated` at all (grant-level denial, not just RLS filtering — see
§8's verification), full CRUD for `service_role`. No anonymous access
anywhere. This matches migrations 014/015's posture for `platform_roles`/
`product_access` exactly.

## 3. Lifecycle model

- **Active grant**: `revoked_at IS NULL` and (`expires_at IS NULL` or
  `expires_at > now()`).
- **Revoked grant**: `revoked_at IS NOT NULL`. Set by
  `lib/capabilities/adminGrants.ts`'s `revokeCapabilityGrant` (an `UPDATE`,
  never a `DELETE`) — the row is preserved for audit, matching the mission's
  "do not physically delete grants" guidance.
- **No hard-delete path exists** in the admin mutation surface built this
  pass (`app/api/admin/capabilities/**`) — only grant (`POST`) and revoke
  (`PATCH { action: 'revoke' }`). A future service-role-only hard-delete for
  GDPR-style erasure would be a deliberate, separate addition, not built
  here (avoiding speculative complexity for a need that doesn't exist yet).
- Lifecycle evaluation (`revoked_at`/`expires_at` vs. "now") happens in
  application code (`lib/capabilities/resolver.ts`'s
  `isGrantCurrentlyActive`), not in a CHECK constraint — SQL CHECK
  constraints cannot reference `now()`.

## 4. Dependency statement

`020_capability_grants.sql` depends only on:

- **`auth.users`** (Supabase-managed, pre-existing) — for the `user_id`/
  `granted_by` foreign keys.
- **`pgcrypto`** (migration 001, already applied) — for `gen_random_uuid()`.

It does **not** have a database-level foreign-key dependency on
`organizations` (010) or any other 010–019 table: `scope_id` is free text,
matching the same code-owned-config pattern `product_access.product_id`
(012) already uses, since `'product'` scope ids reference
`@avatark/product-registry` entries (code, not a DB table) and
`'organization'` scope ids reference `organizations(id)` but are validated
at the application layer (`lib/capabilities/adminGrants.ts`'s
`resolveValidScopeId`, which does a real `SELECT` against `organizations`
before ever inserting), not via a SQL foreign key. This migration is
therefore safe to run any time after `001` and `010` are applied (010 for
the application-layer organization-existence check to have a real table to
query against) — no other 010–019 migration content or their apply order
constrains it further.

## 5. Idempotency audit

Every statement uses an idempotent form: `CREATE TABLE IF NOT EXISTS`,
two `CREATE INDEX IF NOT EXISTS`, `ALTER TABLE ... ENABLE ROW LEVEL
SECURITY` (a no-op if already enabled), `DROP POLICY IF EXISTS` immediately
followed by `CREATE POLICY`, and `GRANT` (re-granting an already-held
privilege is a no-op in Postgres). **Verified directly** (§8): applying this
file twice in a row against a real Postgres 16 instance produced zero
errors on the second pass. Safe to re-run in full.

## 6. Data-loss assessment

**None possible.** `capability_grants` does not exist on `avatark-platform-
test` today (confirmed: `020` was never applied in any form). This
migration only creates a brand-new, empty table — it does not alter, drop,
or backfill any existing table, column, or row. There is nothing to lose.

## 7. Pre-check (read-only — run first)

```sql
-- 1. Confirm 020 is not already recorded.
SELECT filename, checksum, applied_at
FROM public.schema_migrations
WHERE filename = '020_capability_grants.sql';
-- Expected: 0 rows.

-- 2. Confirm capability_grants does not already exist out-of-ledger.
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'capability_grants';
-- Expected: 0 rows.

-- 3. Confirm the prerequisite this migration's app-layer validation
--    depends on: organizations (010) exists (capability_grants itself has
--    no SQL-level FK to it, but lib/capabilities/adminGrants.ts's
--    organization-scope validation queries this table).
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'organizations';
-- Expected: 1 row.

-- 4. Confirm pgcrypto is present (gen_random_uuid()).
SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';
-- Expected: 1 row.

-- 5. Confirm the roles referenced by GRANT statements exist.
SELECT rolname FROM pg_roles WHERE rolname IN ('authenticated', 'service_role');
-- Expected: 2 rows.
```

If query 1 or 2 returns any rows, **stop** and re-audit before proceeding.

## 8. Real verification already performed (disposable Postgres, not avatark-platform-test)

Same discipline as `docs/PLATFORM_DATABASE_VERIFICATION.md` used for
010–016: a disposable, local Postgres 16 container (Docker, destroyed after
use), with a minimal stand-in for the parts of a Supabase project this
migration depends on (`auth.users`, `anon`/`authenticated`/`service_role`
roles, `auth.uid()` reading `request.jwt.claims` exactly as PostgREST does).
The corrected `020_capability_grants.sql` was run **verbatim** — the exact
same content in §10's execution block — against this stand-in. No
credential to the real `avatark-platform-test` project was used or is
available; this does not substitute for running §10 against that real
project.

**1. Clean apply.** Zero errors, first pass.

**2. Idempotency.** Re-applied a second time, back to back: zero errors
(every statement reported `already exists, skipping` or an equivalent
no-op).

**3. The actual bug fix, confirmed:**

| Insert attempted | Result |
|---|---|
| `scope_type='platform', scope_id=NULL` | **Succeeds** — this is the exact case the original PK design could never accept. |
| `scope_type='product', scope_id=NULL` | Rejected — `capability_grants_scope_id_shape_check` violation. |
| `scope_type='product', scope_id=''` | Rejected — same constraint; confirms empty-string is not a loophole. |
| `scope_type='product', scope_id='gamek'` | Succeeds. |
| `scope_type='organization', scope_id='<uuid>'` | Succeeds. |
| `scope_type='wildcard', scope_id='z'` | Rejected (caught by the CHECK constraints — no fourth scope type is possible). |

**4. Uniqueness / lifecycle, confirmed:**

| Scenario | Result |
|---|---|
| Second active grant, same `(user, capability, scope)` | Rejected — `capability_grants_active_unique_idx` violation (**duplicate active grant prevented**). |
| Same capability, different scope (`platform` vs `product`) for the same user | Both succeed (**different scopes allowed**). |
| Revoke a grant (`revoked_at = now()`), then insert a fresh grant for the same `(user, capability, scope)` | Succeeds — the partial index excludes the revoked row. |
| Attempt a second *active* grant while one is already active (no revoke in between) | Rejected — confirms the partial index isn't accidentally too permissive. |

**5. RLS + grants, exercised with real role/JWT simulation (not just SQL
reading):**

| Test | Result |
|---|---|
| User A (`request.jwt.claims.sub = A`) reads `capability_grants` | Sees exactly their own 5 rows |
| User B reads the same table | **Zero rows** — cross-user isolation confirmed |
| `authenticated` (any user) attempts `INSERT` | `permission denied for table capability_grants` — denied at the **grant** level, not merely RLS-filtered |
| `authenticated` attempts `UPDATE` | Same: `permission denied` |
| `authenticated` attempts `DELETE` | Same: `permission denied` |
| `anon` attempts `SELECT` | `permission denied for table capability_grants` — no anonymous access at all |
| `service_role` | Sees all rows; `INSERT`/`UPDATE`/`DELETE` all succeed — confirms the intended admin/service path actually works |

Every row above reflects an actual query result against a running
migration, not an inference from reading the SQL.

## 9. Migration ledger decision: corrected 020 in place, not a new 021

Chosen because `020` has never been applied to `avatark-platform-test` or
any other environment — confirmed via the live project's own
`schema_migrations` table (stops at `019`) and via the fact that no code in
this repo has ever read or written `capability_grants`. There is no
existing ledger row, no recorded checksum, and no data in the (nonexistent)
table for a later "021 fixes 020" migration to reconcile. Per the mission's
own guidance ("prefer correcting 020 in place unless repository policy or
checksum history makes that unsafe") and this repo's own established
precedent (`supabase/scripts/run-platform-migrations.js`'s header comment
describes exactly this kind of in-place correction happening twice already,
for the 010–015 and 017–020 runner-list gaps) — in-place correction is
safe and is what was done. `supabase/scripts/run-platform-migrations.js`'s
`MIGRATION_ORDER` already lists `020_capability_grants.sql` last (no
reordering needed); its checksum is computed fresh from the file's current
content on every run, so the corrected file is picked up automatically with
no runner code change required.

## 10. Execution block

```sql
BEGIN;

-- ============================================================
-- 020_capability_grants.sql (corrected)
-- ============================================================
-- AvatarK Platform — Capability Grants
-- Real gap closed: today's entitlement model only has two granularities --
-- platform_roles (011, global) and organization_members.role (010,
-- org-scoped). Nothing in this schema can express a finer-grained, scoped
-- capability (e.g. a specific product-level permission, or a capability
-- tied to a single organization without also being that org's member
-- role). No code in this repo reads or writes this table yet -- this is
-- forward-looking schema for a real, anticipated need, not a fix for a
-- currently-broken path.
--
-- CORRECTED (never applied in its original form -- confirmed against
-- avatark-platform-test's own schema_migrations, which stops at 019):
-- the first version of this file made scope_id part of the primary key
-- (`primary key (user_id, capability, scope_type, scope_id)`), but this
-- file's own design requires scope_id = NULL for scope_type = 'platform',
-- and PostgreSQL primary-key columns are implicitly NOT NULL -- a
-- platform-scoped grant could never have been inserted. Fixed with a
-- surrogate uuid primary key plus an explicit CHECK constraint that
-- enforces the real invariant (platform => NULL, product/organization =>
-- NOT NULL) directly, instead of leaning on the PK to do double duty as a
-- data-shape constraint it can't actually express for a nullable column.
--
-- scope_type/scope_id follow the same code-owned-config pattern as
-- product_access.product_id (012): scope_id is free text/uuid-as-text,
-- not a foreign key, since 'organization' scope_ids reference
-- organizations(id) but 'product' scope_ids reference
-- lib/products/registry.ts / @avatark/product-registry entries, which are
-- code, not a DB table. scope_id is null for scope_type = 'platform' (no
-- scoping target). Application-layer validation (canonical product-id
-- membership, organization-existence) lives in lib/capabilities/adminGrants.ts,
-- not here -- this migration only enforces what SQL itself can check.
create table if not exists capability_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null,
  scope_type text not null default 'platform',
  scope_id text,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  -- Lifecycle (Part 4 of the redesign): grants are never physically
  -- deleted by the admin mutation path -- expires_at/revoked_at model the
  -- two ways a grant stops being active while preserving the row for
  -- audit. A grant is active iff revoked_at is null and (expires_at is
  -- null or expires_at > now()) -- enforced in lib/capabilities/resolver.ts,
  -- not here (CHECK constraints can't reference now()).
  expires_at timestamptz,
  revoked_at timestamptz,
  constraint capability_grants_scope_type_check
    check (scope_type in ('platform', 'product', 'organization')),
  -- The actual bug fix: platform scope must have no scope_id; product/
  -- organization scope must have a real, non-empty one. No empty-string
  -- scope_id is ever valid -- canonical product ids (@avatark/product-registry)
  -- and organization ids (uuid text) are both non-empty by construction,
  -- so this also closes the empty-string-as-sentinel loophole the
  -- COALESCE-based uniqueness index below would otherwise depend on the
  -- honor system for.
  constraint capability_grants_scope_id_shape_check
    check (
      (scope_type = 'platform' and scope_id is null)
      or (scope_type in ('product', 'organization') and scope_id is not null and scope_id <> '')
    )
);

-- Null-safe uniqueness, scoped to ACTIVE (non-revoked) grants only: at
-- most one non-revoked grant may exist for a given (user, capability,
-- scope) at a time. Deliberately a PARTIAL index (WHERE revoked_at IS
-- NULL), not a plain unique index over the whole table -- a plain index
-- would make re-granting the same capability+scope impossible forever
-- after a single revoke, which contradicts the "preserve history, allow
-- re-grant" lifecycle this design calls for. Revoked rows are excluded
-- from the uniqueness check, so a fresh grant can always be issued after
-- a revoke; multiple revoked historical rows for the same key are
-- expected and fine. scope_id is coalesced to '' only for the purpose of
-- this index's key comparison (NULL <> NULL in a unique index, which
-- would otherwise let two "platform" grants for the same
-- user+capability coexist) -- safe per the CHECK constraint above, which
-- guarantees '' can never be a genuine scope_id value.
create unique index if not exists capability_grants_active_unique_idx
  on capability_grants (user_id, capability, scope_type, coalesce(scope_id, ''))
  where revoked_at is null;

-- Resolving a user's active grants (lib/capabilities/resolver.ts queries
-- WHERE user_id = $1 AND capability = $2, then filters by scope and
-- lifecycle in application code) and admin grant/revoke lookup ("list
-- every grant for this user") both lead with user_id -- this index also
-- serves lookups filtered to user_id alone via the leftmost-prefix rule,
-- so no separate user_id-only index is added.
create index if not exists capability_grants_user_capability_idx
  on capability_grants (user_id, capability);

-- Resolving grants by scope ("who holds capability X in organization Y",
-- an admin/reporting access pattern) -- unchanged from the original design.
create index if not exists capability_grants_scope_idx
  on capability_grants (scope_type, scope_id);

-- RLS: owner-only read, same posture as platform_roles/product_access
-- (014_admin_rls.sql) -- no INSERT/UPDATE/DELETE policy for
-- `authenticated`. All writes go through the service-role admin client
-- (lib/capabilities/adminGrants.ts + app/api/admin/capabilities/**),
-- same as every other admin-write table in this schema.
alter table capability_grants enable row level security;

drop policy if exists "capability_grants_select_own" on capability_grants;
create policy "capability_grants_select_own" on capability_grants
  for select using (user_id = auth.uid());

grant select on capability_grants to authenticated;
grant select, insert, update, delete on capability_grants to service_role;

INSERT INTO public.schema_migrations (filename, checksum)
VALUES ('020_capability_grants.sql', '9e7fcdf3263fc325b6e1576820960a8db1e308e7ddd97db76de002cd052ea5d0')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
```

Checksum computed as `sha256(fs.readFileSync(file, 'utf8'))` — the exact
method `run-platform-migrations.js` uses — against
`supabase/migrations/020_capability_grants.sql` as it exists in this repo at
the time this runbook was written. The `ON CONFLICT (filename) DO NOTHING`
guard (same reasoning as the 010–018 runbook: the table/columns are
unchanged, only the insert is made re-run-safe) means this whole block can
be safely re-submitted if it fails partway, without a duplicate-key error
on a second attempt. If `020_capability_grants.sql` is edited before this
runbook is executed, recompute the checksum first.

**This block has not been executed.** No SQL from this runbook has been run
against `avatark-platform-test`.

## 11. Post-check (read-only — run after execution)

```sql
-- 1. Ledger now includes 020.
SELECT filename, checksum, applied_at
FROM public.schema_migrations
WHERE filename = '020_capability_grants.sql';
-- Expected: exactly 1 row.

-- 2. Table exists with the corrected shape.
SELECT column_name, is_nullable, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'capability_grants'
ORDER BY ordinal_position;
-- Expected columns: id (uuid, NOT NULL), user_id (uuid, NOT NULL),
-- capability (text, NOT NULL), scope_type (text, NOT NULL),
-- scope_id (text, nullable), granted_at (timestamptz, NOT NULL),
-- granted_by (uuid, nullable), expires_at (timestamptz, nullable),
-- revoked_at (timestamptz, nullable).

-- 3. Primary key is the surrogate id, not the old composite.
SELECT a.attname FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE i.indrelid = 'capability_grants'::regclass AND i.indisprimary;
-- Expected: exactly one row, 'id'.

-- 4. Both CHECK constraints exist.
SELECT conname FROM pg_constraint
WHERE conrelid = 'capability_grants'::regclass AND contype = 'c'
ORDER BY conname;
-- Expected: capability_grants_scope_id_shape_check, capability_grants_scope_type_check.

-- 5. The partial unique index exists and is scoped to revoked_at IS NULL.
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'capability_grants' AND indexname = 'capability_grants_active_unique_idx';
-- Expected: 1 row, indexdef contains "WHERE (revoked_at IS NULL)".

-- 6. RLS is enabled.
SELECT relrowsecurity FROM pg_class WHERE relname = 'capability_grants';
-- Expected: true.

-- 7. Exactly one policy, SELECT-only, owner-scoped.
SELECT policyname, cmd, qual FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'capability_grants';
-- Expected: 1 row -- capability_grants_select_own, cmd = SELECT.

-- 8. Grants match the intended posture.
SELECT grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'capability_grants'
  AND grantee IN ('authenticated', 'service_role')
ORDER BY grantee, privilege_type;
-- Expected: authenticated/SELECT only; service_role/{SELECT,INSERT,UPDATE,DELETE}.

-- 9. The table is empty (no writer has ever run against this table).
SELECT count(*) FROM capability_grants;
-- Expected: 0.
```

## 12. Rollback guidance

The table is brand-new and, per §11.9, expected to be empty immediately
after this runbook runs (no application code writes to it in any deployed
environment yet, beyond the admin API built this pass, which nothing has
called against this project). Rollback is safe **only while that remains
true** — re-check `SELECT count(*) FROM capability_grants` before rolling
back if any doubt exists about writes having happened since.

```sql
BEGIN;

DROP TABLE IF EXISTS capability_grants;

DELETE FROM public.schema_migrations
WHERE filename = '020_capability_grants.sql';

COMMIT;
```

Notes:

- `DROP TABLE` removes the table's RLS policy and grants automatically —
  no separate rollback step for those.
- No other table has a foreign key into `capability_grants` (nothing in
  010–019 or elsewhere references it), so this drop has no cascading
  dependency to sequence around, unlike the 010–018 rollback's
  `organizations`/`organization_members` ordering requirement.
- If any row exists and its loss would be a problem, take a `pg_dump` of
  `capability_grants` before running this block.

## 13. Application verification steps (after this migration is actually applied)

1. **Resolver honesty check, pre-migration** (already true today, and
   verified by `lib/capabilities/queries.test.ts`): with the table absent,
   `lib/capabilities/queries.ts`'s `resolveCapability`/
   `listActiveCapabilityGrants` degrade to `{ granted: false, reason:
   'adapter_error' }` / `[]` respectively — never a thrown error, never a
   fabricated grant. The Access tab's "Capabilities" section and
   `app/admin/page.tsx`'s diagnostics summary both already render their
   existing honest-empty states in this environment today, confirmed by
   `pnpm build` succeeding and the app's existing "no specific capabilities
   recorded yet" copy in `packages/account/src/ui/AccessTab.tsx`.
2. **After running §10 against `avatark-platform-test`**: create one real
   grant via `POST /api/admin/capabilities` (requires a session with
   `platform_roles.role = 'admin'` and `SUPABASE_SERVICE_ROLE_KEY`
   configured in that environment) — e.g. a platform-scope
   `platform.capability.manage` grant for a test user — and confirm:
   - `GET /api/admin/capabilities?userId=<id>` returns it.
   - Signed in as that user, `/account`'s Access tab shows the capability
     under the AvatarK entry (platform-scope grants only surface there —
     see `lib/capabilities/labels.ts`).
   - `app/admin/page.tsx`'s diagnostics `membershipRoleCapabilitySummary`
     (platform_operations tier only) includes the raw capability id if the
     signed-in admin holds a platform-scope grant.
   - `PATCH /api/admin/capabilities/<id>` with `{ "action": "revoke" }`
     revokes it; a second revoke attempt on the same id returns an error
     (already revoked, not silently re-accepted); the Access tab and
     diagnostics summary stop showing it.
   - A `platform_audit_events` row exists for both the grant and the revoke
     (`action = 'capability.grant'` / `'capability.revoke'`).
3. **This step has not been performed against the real project** — no
   `SUPABASE_SERVICE_ROLE_KEY`/session is available in this environment
   (same, still-open gap named in `docs/IDENTITY_ACCOUNT_ADMIN_HANDOFF.md`
   and both RC1/RC1.1 release-gate docs). Treat capability grants as
   schema-verified and application-wired, but **not** end-to-end verified
   against a live Supabase project, until this step is actually run there.
