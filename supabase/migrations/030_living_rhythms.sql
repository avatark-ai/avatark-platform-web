-- AvatarK Platform — Sprint 13: Living Rhythms durable state (PROPOSAL --
-- registered in supabase/scripts/run-platform-migrations.js's
-- MIGRATION_ORDER for traceability, but NOT APPLIED to any real database
-- in this environment, matching migrations 023/026/027/028/029's own
-- precedent. @avatark/living-rhythms-runtime's InMemoryPlaceRhythmRepository
-- reference adapter is the only implementation actually exercised this
-- sprint.)
--
-- Backs @avatark/living-rhythms-contracts' own PlaceRhythmRepository
-- interface: one table, `place_rhythm_profiles`.
--
-- Every other Sprint 13 mechanism (DayPhase, RoutineWindow/
-- DailyRhythmDefinition, GroupRoutineIntent, PlaceOccupancy,
-- ResourceOpportunity, SocialInteractionOpportunity) is a pure, resolved-
-- fresh-every-call derivation with no repository of its own -- see
-- docs/SPRINT13_GROUND_TRUTH.md's decisions 1/2/3/5/6. PlaceRhythmProfile
-- is the ONE genuinely new piece of durable state this sprint introduces
-- (decision 4: a small, bounded aggregate, never an event log).
--
-- Source of truth vs projection (Phase 17's own required documentation,
-- restated for this table):
--   place_rhythm_profiles   SOURCE OF TRUTH -- upsert-by-(world, location);
--                           `counts` is a small, FIXED-SHAPE jsonb array
--                           (at most 7 day phases x 5 occupancy levels =
--                           35 counters per location), incrementally
--                           updated in place, never appended to as a
--                           growing history -- "do not create telemetry
--                           exhaust" (Phase 10's own instruction).

CREATE TABLE IF NOT EXISTS place_rhythm_profiles (
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  -- Array of { dayPhase, occupancyLevel, observationCount }, mirroring
  -- @avatark/living-rhythms-contracts' own PlaceRhythmCount[] shape
  -- exactly -- bounded by construction, never validated against a
  -- growing size here (the runtime's own incrementCount already
  -- guarantees at most one counter per (dayPhase, occupancyLevel) pair).
  counts jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_updated_tick integer NOT NULL,
  PRIMARY KEY (world_instance_id, location_id)
);

ALTER TABLE place_rhythm_profiles ENABLE ROW LEVEL SECURITY;

-- World-truth table, same convention as migrations 026/027/028/029's
-- own: shared across every visitor, read-only for authenticated clients,
-- no client-side insert/update/delete policy at all (RLS enabled + no
-- policy for an operation = Postgres denies it outright). The Host's own
-- execution-owner process writes through the service-role key, which
-- bypasses RLS entirely.
DROP POLICY IF EXISTS "place_rhythm_profiles_read" ON place_rhythm_profiles;
CREATE POLICY "place_rhythm_profiles_read" ON place_rhythm_profiles FOR SELECT USING (true);

-- This table touches no protected canonical narrative state and no
-- visitor-owned table -- there is no column, FK, or join to either here,
-- by design (mirrors migration 029's own Phase 14 invariant: emergent/
-- systemic state never gains a write path to canon).
