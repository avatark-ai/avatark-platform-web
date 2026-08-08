-- AvatarK Platform — Sprint 9: Living Systems durable world persistence
-- (PROPOSAL -- registered in supabase/scripts/run-platform-migrations.js's
-- MIGRATION_ORDER for traceability, but NOT APPLIED to any real database.
-- No credentials exist in this environment to safely exercise a real
-- Postgres backend against -- see docs/SPRINT9_FINAL_REPORT.md's Phase 16
-- section. @avatark/world-persistence-runtime's InMemory* reference
-- adapters are the only implementations actually exercised this sprint;
-- this file exists so a reviewer has a concrete schema to react to before
-- any real adapter is written against it, per migration 023's own
-- precedent for "registration is preparation, not application.")
--
-- Backs @avatark/world-persistence-contracts' repository interfaces:
--   DurableWorldStateRepository      -> durable_world_shared_state
--   LivingEntityStateRepository      -> living_entity_state (reused,
--                                        Sprint 7 shape, now durable)
--   WorldCheckpointRepository        -> world_checkpoints
--   DurableWorldSystemEventRepository -> world_system_events
--   WorldInstanceRepository          -> world_instances
--   WorldLeaseRepository             -> world_leases
--   WorldLifecycleRepository         -> world_lifecycle
--   VisitorWorldMemoryRepository     -> visitor_world_memory (reused,
--                                        Sprint 7 shape, now durable)
--
-- Deliberately SEVEN separate tables, not one JSON blob -- the
-- Architectural Law's four state domains (shared/entity/visitor/
-- protected-narrative) stay independently addressable all the way to
-- the schema, and checkpoint/event/lease/lifecycle each have a genuinely
-- different shape and write pattern from the others (Sprint 9's own
-- Phase 1/3/6/7 instructions, echoing migration 023's "never assume they
-- belong in one table"). Protected canonical narrative state has NO
-- table here at all -- it remains separately owned and read-only from
-- this schema's perspective, exactly as it is from the runtime's.

CREATE TABLE IF NOT EXISTS world_instances (
  id text PRIMARY KEY,
  definition_id text NOT NULL,
  definition_version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The SHARED WORLD STATE domain (Architectural Law #1) -- clock, season,
-- environment. `state_version` is the optimistic-concurrency guard
-- (Phase 6): a real adapter's conditionalSave is
--   UPDATE durable_world_shared_state SET ..., state_version = state_version + 1
--   WHERE world_instance_id = $1 AND state_version = $expected
-- and treats an affected-row-count of 0 as a conflict, reloading the
-- current row to return in the ConditionalSaveResult -- never a blind
-- overwrite.
CREATE TABLE IF NOT EXISTS durable_world_shared_state (
  world_instance_id text PRIMARY KEY REFERENCES world_instances(id) ON DELETE CASCADE,
  state_version integer NOT NULL DEFAULT 0,
  tick integer NOT NULL,
  season_id text NOT NULL,
  season_entered_at_tick integer NOT NULL,
  weather jsonb NOT NULL,
  hydrology jsonb NOT NULL,
  ecology jsonb NOT NULL,
  updated_at timestamptz NOT NULL
);

-- The PERSISTENT ENTITY STATE domain (Architectural Law #2). Written in
-- the SAME transaction as the shared-state row it advanced alongside
-- (both tables' rows change together, one logical tick at a time, per
-- @avatark/living-systems-runtime's own advanceWorldSimulation) --
-- `state_version` here records which shared-state version this entity
-- row is consistent with, for a read-time consistency check; it is not
-- an independent optimistic lock (the transaction boundary is what
-- actually prevents drift between this table and durable_world_shared_state,
-- not this column).
CREATE TABLE IF NOT EXISTS living_entity_state (
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  entity_id text NOT NULL,
  archetype_id text NOT NULL,
  location_id text NOT NULL,
  lifecycle_phase text NOT NULL,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_updated_tick integer NOT NULL,
  state_version integer NOT NULL DEFAULT 0,
  PRIMARY KEY (world_instance_id, entity_id)
);

-- Checkpoint (Phase 3): enough state to resume without replaying from
-- tick zero. Idempotent upsert keyed by `id` (Phase 9) -- a retried
-- checkpoint write with the same id is a no-op via ON CONFLICT DO NOTHING
-- in the real adapter, never a duplicate row.
CREATE TABLE IF NOT EXISTS world_checkpoints (
  id text PRIMARY KEY,
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  checkpoint_version integer NOT NULL,
  state_version integer NOT NULL,
  tick integer NOT NULL,
  shared_state jsonb NOT NULL,
  entities jsonb NOT NULL,
  event_sequence_as_of integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL,
  CONSTRAINT world_checkpoints_reason_valid CHECK (reason IN ('periodic', 'dormancy', 'manual', 'recovery'))
);

CREATE INDEX IF NOT EXISTS world_checkpoints_latest_idx
  ON world_checkpoints(world_instance_id, checkpoint_version DESC);

-- Durable WorldSystemEvent (Phase 1/9) -- explicitly NOT
-- experience_events (migration 023); world-scoped, never per-visitor.
-- `event_id` is the idempotency key a retried append dedupes on
-- (`ON CONFLICT (world_instance_id, event_id) DO NOTHING RETURNING ...`,
-- falling back to a SELECT for the original sequence when 0 rows
-- return). `sequence` ordering within one world_instance_id is assigned
-- by the real adapter inside the same transaction as the insert (e.g. via
-- `SELECT COALESCE(MAX(sequence), 0) + 1 ... FOR UPDATE` scoped to this
-- world_instance_id, or an equivalent serializable-write pattern) -- a
-- bare bigserial would number ACROSS instances, not within one, which is
-- what `listAfter(worldInstanceId, afterSequence)` actually needs.
CREATE TABLE IF NOT EXISTS world_system_events (
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  sequence integer NOT NULL,
  type text NOT NULL,
  tick integer NOT NULL,
  detail jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  PRIMARY KEY (world_instance_id, event_id),
  CONSTRAINT world_system_events_sequence_unique UNIQUE (world_instance_id, sequence),
  CONSTRAINT world_system_events_type_valid CHECK (type IN ('season.transitioned', 'entity.lifecycle_changed', 'clock.advanced'))
);

CREATE INDEX IF NOT EXISTS world_system_events_after_idx
  ON world_system_events(world_instance_id, sequence);

-- Execution ownership (Phase 7). One row per world instance -- acquiring
-- when a row already exists and has not expired must fail (an `INSERT
-- ... ON CONFLICT (world_instance_id) DO UPDATE ... WHERE
-- world_leases.expires_at <= now()` pattern returns 0 rows, which the
-- real adapter treats as a `conflict` result, reloading the current
-- lease to report who holds it).
CREATE TABLE IF NOT EXISTS world_leases (
  world_instance_id text PRIMARY KEY REFERENCES world_instances(id) ON DELETE CASCADE,
  owner_id text NOT NULL,
  lease_version integer NOT NULL,
  acquired_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);

-- Lifecycle (Phase 5) -- infrastructure state, not narrative state.
CREATE TABLE IF NOT EXISTS world_lifecycle (
  world_instance_id text PRIMARY KEY REFERENCES world_instances(id) ON DELETE CASCADE,
  state text NOT NULL,
  last_active_at timestamptz NOT NULL,
  last_checkpoint_tick integer NOT NULL,
  CONSTRAINT world_lifecycle_state_valid CHECK (state IN ('DORMANT', 'WAKING', 'ACTIVE', 'QUIESCING'))
);

-- VISITOR MEANINGFUL-MEMORY domain (Architectural Law #3) -- the one
-- table in this migration that IS user-owned, so it gets owner-only RLS
-- like migration 025's journey_states, unlike every other table above.
CREATE TABLE IF NOT EXISTS visitor_world_memory (
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_location_id text,
  meaningful_encounters jsonb NOT NULL DEFAULT '[]'::jsonb,
  reflection_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  milestone_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at_tick integer NOT NULL,
  PRIMARY KEY (world_instance_id, user_id)
);

ALTER TABLE world_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE durable_world_shared_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE living_entity_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_lifecycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_world_memory ENABLE ROW LEVEL SECURITY;

-- World-truth tables (everything except visitor_world_memory) carry no
-- owner_id -- they are shared across every visitor of a world instance
-- by definition (Architectural Law #1/#2), and only ever WRITTEN by the
-- Host's own execution-owner process. RLS is enabled with a read policy
-- for any authenticated visitor and deliberately NO insert/update/delete
-- policy for the `authenticated` role at all -- with RLS enabled and no
-- policy for an operation, Postgres denies it outright, exactly
-- migration 023's "no update/delete policy" idiom, here extended to ALL
-- client-side writes. The Host backend writes through the service-role
-- key, which bypasses RLS entirely, same as platform_audit_events'
-- precedent for server-authored, client-read-only rows.
DROP POLICY IF EXISTS "world_instances_read" ON world_instances;
CREATE POLICY "world_instances_read" ON world_instances FOR SELECT USING (true);

DROP POLICY IF EXISTS "durable_world_shared_state_read" ON durable_world_shared_state;
CREATE POLICY "durable_world_shared_state_read" ON durable_world_shared_state FOR SELECT USING (true);

DROP POLICY IF EXISTS "living_entity_state_read" ON living_entity_state;
CREATE POLICY "living_entity_state_read" ON living_entity_state FOR SELECT USING (true);

DROP POLICY IF EXISTS "world_checkpoints_read" ON world_checkpoints;
CREATE POLICY "world_checkpoints_read" ON world_checkpoints FOR SELECT USING (true);

DROP POLICY IF EXISTS "world_system_events_read" ON world_system_events;
CREATE POLICY "world_system_events_read" ON world_system_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "world_leases_read" ON world_leases;
CREATE POLICY "world_leases_read" ON world_leases FOR SELECT USING (true);

DROP POLICY IF EXISTS "world_lifecycle_read" ON world_lifecycle;
CREATE POLICY "world_lifecycle_read" ON world_lifecycle FOR SELECT USING (true);

-- visitor_world_memory: owner-only, full CRUD -- same convention as
-- migration 025's journey_states_owner_only.
DROP POLICY IF EXISTS "visitor_world_memory_owner_only" ON visitor_world_memory;
CREATE POLICY "visitor_world_memory_owner_only" ON visitor_world_memory
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
