-- AvatarK Platform — Sprint 14: Encounter Realization & Consequence
-- durable state (PROPOSAL -- registered in
-- supabase/scripts/run-platform-migrations.js's MIGRATION_ORDER for
-- traceability, but NOT APPLIED to any real database in this
-- environment, matching migrations 023/026/027/028/029/030's own
-- precedent. @avatark/encounter-realization-runtime's
-- InMemoryEncounterRecordRepository reference adapter is the only
-- implementation actually exercised this sprint.)
--
-- Backs @avatark/encounter-realization-contracts' own
-- EncounterRecordRepository interface: one table, `encounter_records`.
--
-- No other Sprint 14 mechanism gets a table:
--   - Sprint 7's AvailableEncounter, Sprint 10's EncounterOpportunity,
--     Sprint 11's EncounterHistoryEntry keep their own existing,
--     unmodified persistence posture (EncounterHistoryEntry already has
--     migration 028's own table; this migration adds no column to it).
--   - Consequence application writes into repositories that ALREADY
--     have their own migration: world_events/entity_memory_entries
--     (028), relationships (029, RelationshipEvidence.encounterCount is
--     an in-place jsonb field update, not a new column -- see below).
--
-- Source of truth vs projection (Phase 17's own required documentation,
-- restated for this table):
--   encounter_records   SOURCE OF TRUTH -- one row per content-derived
--                        EncounterRecord id (see
--                        @avatark/encounter-realization-runtime's own
--                        `deriveEncounterRecordId`), upsert-by-id so a
--                        replayed wake's identical id updates the SAME
--                        row rather than inserting a duplicate --
--                        `causal_references`/`relationship_context` are
--                        small, bounded jsonb arrays scoped to one
--                        encounter's own participants, never a growing
--                        per-tick log.

CREATE TABLE IF NOT EXISTS encounter_records (
  id text PRIMARY KEY,
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  category text NOT NULL,
  location_id text NOT NULL,
  participant_entity_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  participant_group_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  start_tick integer NOT NULL,
  realization_tick integer,
  completion_tick integer,
  -- Mirrors @avatark/encounter-realization-contracts' own closed
  -- EncounterRealizationStatus union exactly -- a CHECK constraint, not
  -- a free-form text column, so an invalid status can never be written
  -- even by a direct SQL statement bypassing the application layer.
  status text NOT NULL CHECK (status IN ('REALIZING', 'REALIZED', 'CONSEQUENCES_APPLIED', 'REMEMBERED', 'EXPIRED', 'BLOCKED', 'SUPERSEDED')),
  -- Mirrors CausalReference[]/RelationshipContext[] exactly -- bounded
  -- by construction (at most one entry per participating relationship),
  -- never validated against a growing size here.
  causal_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  relationship_context jsonb NOT NULL DEFAULT '[]'::jsonb,
  protected_narrative_gate_open boolean NOT NULL,
  world_event_id text,
  encounter_history_entry_id text,
  variation_consulted double precision
);

CREATE INDEX IF NOT EXISTS encounter_records_by_location ON encounter_records (world_instance_id, location_id);

ALTER TABLE encounter_records ENABLE ROW LEVEL SECURITY;

-- World-truth table, same convention as migrations 026/027/028/029/030's
-- own: shared across every visitor, read-only for authenticated clients,
-- no client-side insert/update/delete policy at all (RLS enabled + no
-- policy for an operation = Postgres denies it outright). The Host's own
-- execution-owner process writes through the service-role key, which
-- bypasses RLS entirely.
DROP POLICY IF EXISTS "encounter_records_read" ON encounter_records;
CREATE POLICY "encounter_records_read" ON encounter_records FOR SELECT USING (true);

-- This table touches no protected canonical narrative state and no
-- visitor-owned table -- there is no column, FK, or join to either here,
-- by design (mirrors migration 029/030's own equivalent invariant:
-- emergent/systemic state never gains a write path to canon).
--
-- RelationshipEvidence.encounterCount (Sprint 14, Phase 8, additive
-- optional field on @avatark/social-ecology-contracts' own
-- RelationshipEvidence) requires NO schema change here: migration 029's
-- own `relationships` table already stores `evidence` as a single jsonb
-- column, so a new optional key inside that same jsonb value needs no
-- ALTER TABLE at all -- the same "additive field, zero schema migration"
-- property every other jsonb-backed evidence/detail column in this
-- whole domain already has.
