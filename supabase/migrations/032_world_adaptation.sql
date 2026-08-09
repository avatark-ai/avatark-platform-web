-- AvatarK Platform — Sprint 15: World Adaptation & Emergent Futures
-- durable state (PROPOSAL -- registered in
-- supabase/scripts/run-platform-migrations.js's MIGRATION_ORDER for
-- traceability, but NOT APPLIED to any real database in this
-- environment, matching migrations 023/026/027/028/029/030/031's own
-- precedent. @avatark/world-adaptation-runtime's
-- InMemoryAdaptationPressureRepository/InMemoryAdaptationEffectRepository
-- reference adapters are the only implementations actually exercised
-- this sprint.)
--
-- Backs @avatark/world-adaptation-contracts' own
-- AdaptationPressureRepository and AdaptationEffectRepository
-- interfaces: two tables, `adaptation_pressure` and
-- `adaptation_effects`.
--
-- No other Sprint 15 mechanism gets a table: AdaptationSignal/
-- AdaptationDecision/WorldAdaptationResult are transient, recomputed
-- fresh every wake from already-durable state -- the same "resolved
-- fresh, no repository of its own" posture Sprint 13's own
-- DayPhase/ResourceOpportunity/SocialInteractionOpportunity already
-- established (see docs/SPRINT13_GROUND_TRUTH.md's decisions 1/2/3/5).
--
-- Source of truth vs projection (every prior sprint's own required
-- documentation, restated for these two tables):
--   adaptation_pressure   SOURCE OF TRUTH -- upsert-by-(world, domain,
--                         subject, kind); a single row per subject
--                         holding the CURRENT accumulated, decaying
--                         value -- never an event log (mission's own
--                         "bounded accumulation," never "telemetry
--                         exhaust").
--   adaptation_effects    SOURCE OF TRUTH -- append-by-content-derived-id
--                         (id encodes worldId/ruleId/subjectId/tier, see
--                         @avatark/world-adaptation-runtime's own
--                         `deriveAdaptationEffectId`), one row per
--                         genuinely NEW tier-crossing -- upsert-by-id so
--                         a replayed wake's identical id updates the
--                         SAME row rather than inserting a duplicate,
--                         the exact idempotency mechanism migration
--                         031's own encounter_records table already
--                         established for EncounterRecord.
--
-- Every Sprint 15 effect that has a legitimate existing write boundary
-- (ENTITY -> EntityMemoryEntry via migration 028's own
-- entity_memory_entries table; RELATIONSHIP -> RelationshipEvidence via
-- migration 029's own relationships table, in-place jsonb field, no new
-- column) writes through that EXISTING table -- never a second,
-- competing mutation path. See lib/worldAdaptation/hostService.ts's own
-- `applyAdaptationEffect`.

CREATE TABLE IF NOT EXISTS adaptation_pressure (
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  -- Mirrors @avatark/world-adaptation-contracts' own closed
  -- AdaptationDomain union exactly -- a CHECK constraint, not a
  -- free-form text column.
  domain text NOT NULL CHECK (domain IN ('ENTITY', 'RELATIONSHIP', 'PLACE', 'GROUP', 'WORLD_POSSIBILITY')),
  -- An existing EntityId/RelationshipId/LocationId/GroupId/
  -- EncounterRuleId, or (for a per-resource-category place reading) the
  -- Host-established composite `${locationId}:${category}` key -- never
  -- a new identity space minted by this table.
  subject_id text NOT NULL,
  -- Mirrors @avatark/world-adaptation-contracts' own closed
  -- AdaptationSignalKind union exactly.
  kind text NOT NULL CHECK (kind IN ('ENCOUNTER_INVOLVEMENT', 'ENCOUNTER_EVIDENCE', 'RESOURCE_SCARCITY', 'RESOURCE_ABUNDANCE')),
  value double precision NOT NULL,
  last_updated_tick integer NOT NULL,
  PRIMARY KEY (world_instance_id, domain, subject_id, kind)
);

CREATE TABLE IF NOT EXISTS adaptation_effects (
  id text PRIMARY KEY,
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  domain text NOT NULL CHECK (domain IN ('ENTITY', 'RELATIONSHIP', 'PLACE', 'GROUP', 'WORLD_POSSIBILITY')),
  subject_id text NOT NULL,
  -- Mirrors the union of every per-domain AdaptationEffect kind
  -- vocabulary -- a single CHECK across all five domains' own closed
  -- kinds (application-layer logic, not this constraint, ensures a
  -- given row's kind matches its own domain, the same posture
  -- `EncounterConsequence`'s own two-domain union already holds one
  -- migration earlier).
  kind text NOT NULL CHECK (
    kind IN (
      'ROUTINE_PREFERENCE', 'RESOURCE_PREFERENCE_BIAS', 'LOCATION_PREFERENCE', 'SOCIAL_AFFINITY', 'SOCIAL_AVOIDANCE', 'GROUP_PARTICIPATION_BIAS',
      'AFFINITY_BIAS', 'INTERACTION_LIKELIHOOD_BIAS',
      'HABITUAL_OCCUPANCY', 'USE_PRESSURE', 'RESOURCE_PRESSURE', 'SOCIAL_SIGNIFICANCE', 'ENCOUNTER_ELIGIBILITY',
      'COHESION_BIAS', 'GROUP_ROUTINE_PREFERENCE', 'MOVEMENT_TENDENCY',
      'ENCOUNTER_WEIGHT_BIAS', 'RESOURCE_AVAILABILITY_CONSEQUENCE', 'ROUTINE_SELECTION_BIAS'
    )
  ),
  tier integer NOT NULL,
  applied_tick integer NOT NULL,
  reversible boolean NOT NULL,
  causal_references jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS adaptation_effects_by_subject ON adaptation_effects (world_instance_id, domain, subject_id);

ALTER TABLE adaptation_pressure ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptation_effects ENABLE ROW LEVEL SECURITY;

-- World-truth tables, same convention as migrations 026/027/028/029/
-- 030/031's own: shared across every visitor, read-only for
-- authenticated clients, no client-side insert/update/delete policy at
-- all (RLS enabled + no policy for an operation = Postgres denies it
-- outright). The Host's own execution-owner process writes through the
-- service-role key, which bypasses RLS entirely.
DROP POLICY IF EXISTS "adaptation_pressure_read" ON adaptation_pressure;
CREATE POLICY "adaptation_pressure_read" ON adaptation_pressure FOR SELECT USING (true);
DROP POLICY IF EXISTS "adaptation_effects_read" ON adaptation_effects;
CREATE POLICY "adaptation_effects_read" ON adaptation_effects FOR SELECT USING (true);

-- Neither table touches protected canonical narrative state and
-- neither touches any visitor-owned table -- there is no column, FK, or
-- join to either here, by design (mirrors every prior sprint's own
-- equivalent invariant: emergent/systemic state never gains a write
-- path to canon, and shared-world adaptation never reads a
-- visitor-scoped record). See docs/SPRINT15_FINAL_REPORT.md's
-- multi-visitor-law section.
