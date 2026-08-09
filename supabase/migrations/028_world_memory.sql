-- AvatarK Platform — Sprint 11: World Memory / Entity Memory durable
-- state (PROPOSAL -- registered in supabase/scripts/run-platform-migrations.js's
-- MIGRATION_ORDER for traceability, but NOT APPLIED to any real database
-- in this environment, matching migrations 023/026/027's own precedent.
-- @avatark/world-memory-runtime's InMemory* reference adapters are the
-- only implementations actually exercised this sprint.)
--
-- Backs @avatark/world-memory-contracts' repository interfaces:
--   WorldEventRepository          -> world_events
--   EntityMemoryRepository        -> entity_memory_entries
--   HistoricalMarkerRepository    -> historical_markers
--   EncounterHistoryRepository    -> encounter_history_entries
--
-- Deliberately FOUR separate tables, not one JSON blob -- World Memory,
-- Entity Memory, location-scoped historical markers, and encounter
-- lifecycle history are four genuinely different write patterns and
-- query shapes (mission's own Phase 1 instruction: "do not overload an
-- existing store merely because it already stores events"). None of
-- these are visitor-owned -- all four are WORLD-scoped, shared truth,
-- exactly like migration 026/027's own world-truth tables, and
-- explicitly NOT the same table as migration 023's visitor-scoped
-- experience_events or Sprint 7's own (unmodified, still in-memory)
-- world_system_events concept.
--
-- Source of truth vs projection (Phase 17's own required documentation):
--   world_events               SOURCE OF TRUTH (significance-filtered,
--                               never re-derived once written)
--   entity_memory_entries      DERIVED from world_events' own
--                               consequences/participants -- kept as
--                               its own durable table (not re-derived on
--                               every read) because Entity Memory must
--                               survive independent of whether the
--                               originating WorldEvent is later
--                               compacted (Phase 19)
--   historical_markers         DERIVED from world_events' own
--                               LOCATION_HISTORY_MARKER consequences,
--                               same durability rationale as entity_memory_entries
--   encounter_history_entries  SOURCE OF TRUTH for encounter lifecycle
--                               (computed by diffing two ticks'
--                               opportunity sets, but the DIFF RESULT
--                               itself is not re-derivable without the
--                               full opportunity history, so it is
--                               stored, not treated as a cache)

CREATE TABLE IF NOT EXISTS world_events (
  id text PRIMARY KEY,
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  tick integer NOT NULL,
  category text NOT NULL,
  location_id text,
  participant_entity_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  causal_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  consequences jsonb NOT NULL DEFAULT '[]'::jsonb,
  significance text NOT NULL,
  retention_tier text NOT NULL,
  provenance jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  CONSTRAINT world_events_category_valid CHECK (category IN ('SEASON_TRANSITION', 'ENVIRONMENTAL_THRESHOLD', 'RESOURCE_CONDITION_CHANGED', 'POPULATION_MOVEMENT', 'GROUP_FORMED', 'GROUP_DISPERSED', 'ENTITY_ACTIVITY_TRANSITION', 'ENCOUNTER_BECAME_AVAILABLE', 'ENCOUNTER_RESOLVED', 'LOCATION_CONDITION_CHANGED')),
  CONSTRAINT world_events_significance_valid CHECK (significance IN ('MEANINGFUL', 'LANDMARK')), -- NOT_SIGNIFICANT candidates are never persisted at all
  CONSTRAINT world_events_retention_tier_valid CHECK (retention_tier IN ('RECENT', 'DURABLE', 'LANDMARK', 'COMPACTABLE'))
);

CREATE INDEX IF NOT EXISTS world_events_since_tick_idx ON world_events(world_instance_id, tick);
CREATE INDEX IF NOT EXISTS world_events_location_idx ON world_events(world_instance_id, location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS world_events_category_idx ON world_events(world_instance_id, category);
-- Participant/entity lookup uses a GIN index over the jsonb array rather
-- than a join table -- appropriate at this stage's data volume; a real
-- archival/scale pass (Phase 19's own deferred concern) may revisit this.
CREATE INDEX IF NOT EXISTS world_events_participants_idx ON world_events USING gin (participant_entity_ids);

CREATE TABLE IF NOT EXISTS entity_memory_entries (
  id text PRIMARY KEY,
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  entity_id text NOT NULL,
  type text NOT NULL,
  tick integer NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  significance text NOT NULL,
  provenance jsonb NOT NULL,
  CONSTRAINT entity_memory_entries_type_valid CHECK (type IN ('PREVIOUS_RESOURCE_LOCATION', 'RECENT_GROUP_MEMBERSHIP', 'RECENT_STRESS_CONDITION', 'RECENT_RELOCATION', 'RECENT_ENCOUNTER_INVOLVEMENT'))
);

CREATE INDEX IF NOT EXISTS entity_memory_entries_entity_idx ON entity_memory_entries(world_instance_id, entity_id, type, tick DESC);
-- A real adapter's append() enforces the same "keep only the most
-- recent K per (entity_id, type)" bound the in-memory reference
-- implementation already does (Phase 6's own "minimal meaningful
-- memory") -- via a trigger or an application-layer prune-after-insert,
-- not a table-level constraint; not implemented here since this
-- migration is prepared, not applied.

CREATE TABLE IF NOT EXISTS historical_markers (
  id text PRIMARY KEY,
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  tick integer NOT NULL,
  category text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  provenance jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS historical_markers_location_idx ON historical_markers(world_instance_id, location_id);

CREATE TABLE IF NOT EXISTS encounter_history_entries (
  id text PRIMARY KEY,
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  location_id text NOT NULL,
  category text NOT NULL,
  status text NOT NULL,
  tick integer NOT NULL,
  contributing_entity_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT encounter_history_entries_status_valid CHECK (status IN ('AVAILABLE', 'RESOLVED', 'NO_LONGER_AVAILABLE'))
);

CREATE INDEX IF NOT EXISTS encounter_history_entries_rule_idx ON encounter_history_entries(world_instance_id, rule_id, tick DESC);

ALTER TABLE world_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_history_entries ENABLE ROW LEVEL SECURITY;

-- World-truth tables, same convention as migrations 026/027's own:
-- shared across every visitor, read-only for authenticated clients, no
-- client-side insert/update/delete policy at all (RLS enabled + no
-- policy for an operation = Postgres denies it outright). The Host's
-- own execution-owner process writes through the service-role key,
-- which bypasses RLS entirely.
DROP POLICY IF EXISTS "world_events_read" ON world_events;
CREATE POLICY "world_events_read" ON world_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "entity_memory_entries_read" ON entity_memory_entries;
CREATE POLICY "entity_memory_entries_read" ON entity_memory_entries FOR SELECT USING (true);

DROP POLICY IF EXISTS "historical_markers_read" ON historical_markers;
CREATE POLICY "historical_markers_read" ON historical_markers FOR SELECT USING (true);

DROP POLICY IF EXISTS "encounter_history_entries_read" ON encounter_history_entries;
CREATE POLICY "encounter_history_entries_read" ON encounter_history_entries FOR SELECT USING (true);

-- No table in this migration touches protected canonical narrative
-- state -- there is no table for it here, by design (Phase 14's own
-- invariant: emergent history must never gain a write path to canon).
-- Protected narrative remains wherever a future real narrative system
-- owns it, entirely outside this migration's scope.
