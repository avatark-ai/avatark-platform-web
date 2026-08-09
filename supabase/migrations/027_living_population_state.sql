-- AvatarK Platform — Sprint 10: living-population/behavior durable state
-- (PROPOSAL -- registered in supabase/scripts/run-platform-migrations.js's
-- MIGRATION_ORDER for traceability, but NOT APPLIED to any real database
-- in this environment, matching migration 023's and migration 026's own
-- precedent. @avatark/living-population-runtime's InMemory* reference
-- adapters are the only implementations actually exercised this sprint.)
--
-- Backs @avatark/living-population-contracts' repository interfaces:
--   EntityBehaviorStateRepository -> entity_behavior_state
--   GroupStateRepository          -> group_state
--
-- Population entity IDENTITY/location/coarse-lifecycle does NOT get a
-- new table here -- it reuses migration 026's own `living_entity_state`
-- table (@avatark/living-systems-contracts' LivingEntityStateRepository,
-- unmodified), keyed by the same world_instance_id, simply holding a
-- second, disjoint roster of entity ids alongside the vegetation roster
-- (see docs/SPRINT10_GROUND_TRUTH.md's "roster-split decision"). Only
-- the genuinely NEW Sprint 10 concepts (needs/rhythm/activity/movement/
-- group) get new tables here -- never a merge into one blob, and never a
-- second copy of what migration 026 already models.

CREATE TABLE IF NOT EXISTS entity_behavior_state (
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  entity_id text NOT NULL,
  needs jsonb NOT NULL DEFAULT '[]'::jsonb,
  rhythm_phase text NOT NULL,
  activity text NOT NULL,
  movement_type text NOT NULL,
  movement_target_location_id text,
  group_id text,
  last_updated_tick integer NOT NULL,
  PRIMARY KEY (world_instance_id, entity_id),
  CONSTRAINT entity_behavior_state_rhythm_phase_valid CHECK (rhythm_phase IN ('REST', 'WAKE', 'FORAGE', 'DRINK', 'MOVE', 'SOCIAL', 'RETURN')),
  CONSTRAINT entity_behavior_state_activity_valid CHECK (activity IN ('REST', 'GRAZE', 'DRINK', 'MOVE_TO_RESOURCE', 'FOLLOW_GROUP', 'SOCIALIZE', 'RETURN_TO_GROUP', 'REMAIN')),
  CONSTRAINT entity_behavior_state_movement_type_valid CHECK (movement_type IN ('MoveToLocation', 'Remain', 'FollowGroup', 'ApproachResource', 'ReturnToGroup'))
);

CREATE TABLE IF NOT EXISTS group_state (
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  id text NOT NULL,
  kind text NOT NULL,
  member_entity_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  location_id text NOT NULL,
  target_location_id text,
  cohesion double precision NOT NULL,
  last_updated_tick integer NOT NULL,
  PRIMARY KEY (world_instance_id, id),
  CONSTRAINT group_state_kind_valid CHECK (kind IN ('herd', 'flock')),
  CONSTRAINT group_state_cohesion_bounded CHECK (cohesion >= 0 AND cohesion <= 1)
);

ALTER TABLE entity_behavior_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_state ENABLE ROW LEVEL SECURITY;

-- World-truth tables, same convention as migration 026's own world-truth
-- tables (durable_world_shared_state, living_entity_state, etc): shared
-- across every visitor of a world instance, read-only for authenticated
-- clients, written only by the Host's own execution-owner process via
-- the service-role key (RLS enabled, no client insert/update/delete
-- policy -- Postgres denies those outright).
DROP POLICY IF EXISTS "entity_behavior_state_read" ON entity_behavior_state;
CREATE POLICY "entity_behavior_state_read" ON entity_behavior_state FOR SELECT USING (true);

DROP POLICY IF EXISTS "group_state_read" ON group_state;
CREATE POLICY "group_state_read" ON group_state FOR SELECT USING (true);
