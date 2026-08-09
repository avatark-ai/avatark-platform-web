-- AvatarK Platform — Sprint 12: Social Ecology durable state (PROPOSAL --
-- registered in supabase/scripts/run-platform-migrations.js's
-- MIGRATION_ORDER for traceability, but NOT APPLIED to any real database
-- in this environment, matching migrations 023/026/027/028's own
-- precedent. @avatark/social-ecology-runtime's InMemory* reference
-- adapters are the only implementations actually exercised this sprint.)
--
-- Backs @avatark/social-ecology-contracts' repository interfaces:
--   RelationshipRepository       -> relationships
--   GroupMembershipRepository    -> group_memberships
--   FamiliarityRepository        -> familiarity_states
--   HomeRangeRepository          -> home_ranges
--   SeparationRepository         -> separations
--
-- Five separate tables, not one JSON blob -- relationships,
-- group-membership audit, familiarity, territory, and separation/reunion
-- are five genuinely different write patterns and query shapes, the
-- same "do not overload an existing store" discipline migration 028
-- itself followed. All WORLD-scoped shared truth, never visitor-owned.
--
-- Source of truth vs projection (Phase 17's own required documentation,
-- restated for this table set):
--   relationships          SOURCE OF TRUTH -- upsert-by-id (id is the
--                          relationship identity itself, never
--                          content-derived, since a relationship is
--                          established once and its evidence evolves in
--                          place, unlike an append-only event log)
--   group_memberships      SOURCE OF TRUTH for audit/identity only --
--                          `GroupState.memberEntityIds` (migration 027's
--                          own group_states table) remains the SOLE
--                          authority that actually drives cohesion;
--                          this table never gets a second read path for
--                          "is X currently in group Y" (see
--                          docs/SPRINT12_GROUND_TRUTH.md's "group
--                          membership stays audit-only" decision)
--   familiarity_states     SOURCE OF TRUTH -- upsert-by-normalized-pair
--   home_ranges            SOURCE OF TRUTH -- upsert-by-owner
--   separations            SOURCE OF TRUTH -- upsert-by-subject; a
--                          resolved (active=false) row is retained, not
--                          deleted, since its own resolvedAtTick /
--                          separatedSinceTick pair IS the reunion
--                          duration's own provenance

CREATE TABLE IF NOT EXISTS relationships (
  id text PRIMARY KEY,
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  entity_a_id text NOT NULL,
  entity_b_id text NOT NULL,
  relationship_type text NOT NULL,
  band text NOT NULL,
  evidence jsonb NOT NULL,
  established_tick integer NOT NULL,
  last_relevant_tick integer NOT NULL,
  CONSTRAINT relationships_type_valid CHECK (relationship_type IN ('PARENT_OFFSPRING', 'GROUP_MEMBER', 'FAMILIAR', 'PREFERRED_ASSOCIATE')),
  CONSTRAINT relationships_band_valid CHECK (band IN ('WEAK', 'ESTABLISHED', 'STRONG'))
);

CREATE INDEX IF NOT EXISTS relationships_entity_a_idx ON relationships(world_instance_id, entity_a_id);
CREATE INDEX IF NOT EXISTS relationships_entity_b_idx ON relationships(world_instance_id, entity_b_id);
CREATE INDEX IF NOT EXISTS relationships_type_idx ON relationships(world_instance_id, relationship_type);

CREATE TABLE IF NOT EXISTS group_memberships (
  id text PRIMARY KEY,
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  group_id text NOT NULL,
  entity_id text NOT NULL,
  role text NOT NULL,
  status text NOT NULL,
  established_tick integer NOT NULL,
  left_tick integer,
  CONSTRAINT group_memberships_role_valid CHECK (role IN ('MEMBER', 'REFERENCE_ENTITY')),
  CONSTRAINT group_memberships_status_valid CHECK (status IN ('ACTIVE', 'LEFT'))
);

CREATE INDEX IF NOT EXISTS group_memberships_group_idx ON group_memberships(world_instance_id, group_id);
CREATE INDEX IF NOT EXISTS group_memberships_entity_idx ON group_memberships(world_instance_id, entity_id);

CREATE TABLE IF NOT EXISTS familiarity_states (
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  entity_a_id text NOT NULL,
  entity_b_id text NOT NULL,
  band text NOT NULL,
  evidence jsonb NOT NULL,
  last_updated_tick integer NOT NULL,
  -- entity_a_id/entity_b_id are always stored normalized (a <= b, per
  -- @avatark/social-ecology-contracts' own normalizeEntityPair), so
  -- this pair is the natural, order-independent primary key.
  PRIMARY KEY (world_instance_id, entity_a_id, entity_b_id),
  CONSTRAINT familiarity_states_band_valid CHECK (band IN ('UNKNOWN', 'SEEN', 'FAMILIAR'))
);

CREATE INDEX IF NOT EXISTS familiarity_states_entity_a_idx ON familiarity_states(world_instance_id, entity_a_id);
CREATE INDEX IF NOT EXISTS familiarity_states_entity_b_idx ON familiarity_states(world_instance_id, entity_b_id);

CREATE TABLE IF NOT EXISTS home_ranges (
  id text PRIMARY KEY,
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  owner_type text NOT NULL,
  owner_id text NOT NULL,
  preferred_location_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  established_tick integer NOT NULL,
  CONSTRAINT home_ranges_owner_type_valid CHECK (owner_type IN ('ENTITY', 'GROUP')),
  CONSTRAINT home_ranges_owner_unique UNIQUE (world_instance_id, owner_type, owner_id)
);

CREATE TABLE IF NOT EXISTS separations (
  id text PRIMARY KEY,
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  entity_id text NOT NULL,
  separated_since_tick integer NOT NULL,
  active boolean NOT NULL,
  resolved_at_tick integer,
  CONSTRAINT separations_subject_type_valid CHECK (subject_type IN ('RELATIONSHIP', 'GROUP_MEMBERSHIP')),
  -- subject_id is Host-chosen (see lib/socialEcology/hostService.ts):
  -- a relationship's own id for RELATIONSHIP subjects (one relationship
  -- = one tracked separation), and "<group_id>::<entity_id>" for
  -- GROUP_MEMBERSHIP subjects (disambiguating multiple independently-
  -- separated members of the same group) -- this contract never
  -- interprets the string, only carries it through.
  CONSTRAINT separations_subject_unique UNIQUE (world_instance_id, subject_type, subject_id)
);

CREATE INDEX IF NOT EXISTS separations_entity_idx ON separations(world_instance_id, entity_id) WHERE active;

ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE familiarity_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE separations ENABLE ROW LEVEL SECURITY;

-- World-truth tables, same convention as migrations 026/027/028's own:
-- shared across every visitor, read-only for authenticated clients, no
-- client-side insert/update/delete policy at all (RLS enabled + no
-- policy for an operation = Postgres denies it outright). The Host's
-- own execution-owner process writes through the service-role key,
-- which bypasses RLS entirely.
DROP POLICY IF EXISTS "relationships_read" ON relationships;
CREATE POLICY "relationships_read" ON relationships FOR SELECT USING (true);

DROP POLICY IF EXISTS "group_memberships_read" ON group_memberships;
CREATE POLICY "group_memberships_read" ON group_memberships FOR SELECT USING (true);

DROP POLICY IF EXISTS "familiarity_states_read" ON familiarity_states;
CREATE POLICY "familiarity_states_read" ON familiarity_states FOR SELECT USING (true);

DROP POLICY IF EXISTS "home_ranges_read" ON home_ranges;
CREATE POLICY "home_ranges_read" ON home_ranges FOR SELECT USING (true);

DROP POLICY IF EXISTS "separations_read" ON separations;
CREATE POLICY "separations_read" ON separations FOR SELECT USING (true);

-- No table in this migration touches protected canonical narrative
-- state or any visitor-owned table -- there is no column, FK, or join
-- to either here, by design (mirrors migration 028's own Phase 14
-- invariant: emergent/systemic state never gains a write path to canon).
