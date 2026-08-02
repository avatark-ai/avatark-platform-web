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
