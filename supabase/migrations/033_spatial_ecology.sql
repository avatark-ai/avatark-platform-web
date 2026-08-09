-- AvatarK Platform — Sprint 16: Spatial Ecology & Territory durable
-- state (PROPOSAL -- registered in
-- supabase/scripts/run-platform-migrations.js's MIGRATION_ORDER for
-- traceability, but NOT APPLIED to any real database in this
-- environment, matching migrations 023/026/027/028/029/030/031/032's
-- own precedent. @avatark/spatial-ecology-runtime's own
-- InMemoryTerritoryClaimRepository reference adapter is the only
-- implementation actually exercised this sprint.)
--
-- Backs @avatark/spatial-ecology-contracts' own TerritoryClaimRepository
-- interface: ONE table, `territory_claims`.
--
-- Every other Sprint 16 spatial concept gets NO table, by design (see
-- docs/SPRINT16_FINAL_REPORT.md and the Sprint 16 Phase 0 architecture
-- doc, section 17):
--   DomainDefinition/SectorDefinition/QuadrantDefinition/PatchDefinition/
--   LocalPlaceDefinition/SpatialEdge/RouteDefinition   STATIC, authored
--     spatial grammar -- shipped as Host-layer config (see
--     lib/spatialEcology/vrindavanSpatialDefinition.ts), the same
--     posture EntityArchetype[]/SeasonDefinition[]/AdaptationRule[]
--     already hold. No per-instance row.
--   PatchState/RouteState/TerritoryPressure   ALWAYS resolved FRESH
--     from already-durable Living Systems/Population/Rhythms/Adaptation
--     state plus the static grammar above -- the same "resolved fresh,
--     no repository of its own" posture Sprint 13's own
--     PlaceOccupancy/ResourceOpportunity already established. Never a
--     second causal engine's worth of storage.
--
-- Source of truth vs projection:
--   territory_claims   SOURCE OF TRUTH for which (HomeRange, Patch)
--     aggregations have been derived -- upsert-by-content-derived-id
--     (id encodes homeRangeId/patchId, see
--     @avatark/spatial-ecology-runtime's own `deriveTerritoryClaimId`),
--     the exact idempotency mechanism migration 031's own
--     encounter_records table already established for EncounterRecord.
--     This table NEVER duplicates home_ranges (migration 029) --
--     `home_range_id` is a reference, not a copy of
--     `preferred_location_ids`; the sole durable ownership/preference
--     record remains `home_ranges`.

CREATE TABLE IF NOT EXISTS territory_claims (
  id text PRIMARY KEY,
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  home_range_id text NOT NULL,
  -- Denormalized reference fields (never a second source of truth for
  -- ownership -- see home_ranges.owner_type/owner_id, migration 029).
  owner_type text NOT NULL CHECK (owner_type IN ('ENTITY', 'GROUP')),
  owner_id text NOT NULL,
  patch_id text NOT NULL,
  strength text NOT NULL CHECK (strength IN ('PRIMARY', 'SECONDARY')),
  established_tick integer NOT NULL
);

CREATE INDEX IF NOT EXISTS territory_claims_by_patch ON territory_claims (world_instance_id, patch_id);
CREATE INDEX IF NOT EXISTS territory_claims_by_home_range ON territory_claims (world_instance_id, home_range_id);
