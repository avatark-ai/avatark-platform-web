-- AvatarK Platform — Sprint 18: Narrative Presence & Canonical Event
-- Integration durable state (PROPOSAL -- registered in
-- supabase/scripts/run-platform-migrations.js's MIGRATION_ORDER for
-- traceability, but NOT APPLIED to any real database in this
-- environment, matching migrations 023/026-033's own precedent.
-- @avatark/canonical-event-runtime's own
-- InMemoryWorldInstanceCanonicalProjectionStateRepository/
-- InMemoryVisitorCanonicalEventWitnessRepository reference adapters are
-- the only implementations actually exercised this sprint.)
--
-- Backs @avatark/canonical-event-contracts' own
-- WorldInstanceCanonicalProjectionStateRepository and
-- VisitorCanonicalEventWitnessRepository interfaces: two tables,
-- `canonical_event_projection_state` and
-- `visitor_canonical_event_witness`.
--
-- `CanonicalEventDefinition` (the authored Canon content itself) gets
-- NO table at all, by design: it has no repository interface in the
-- first place (see docs/SPRINT18_FINAL_REPORT.md and Sprint 18's own
-- Phase 0 architecture doc, section 4) -- Canon immutability here is
-- structural (no write method exists to omit), the same posture
-- `protected_narrative` state already holds. Once a real StudioK
-- `*.canonical-events.json` artifact exists, its own identity/checksum
-- travels through the EXISTING `manifest.json`-adjacent mechanism
-- (Sprint 6), never a new table here.
--
-- Source of truth vs projection:
--   canonical_event_projection_state   SOURCE OF TRUTH for Fact A
--     (world-scoped, actor-independent): one row per
--     (world_instance_id, canonical_event_id), upsert-by-that-pair.
--     `activation_id` is content-derived
--     (`deriveCanonicalActivationId`, sha256 over worldInstanceId |
--     canonicalEventId | definitionContentHash | activationTick) and,
--     once non-null, is never recomputed differently for the SAME
--     pair -- the entire idempotency mechanism, checked before any
--     consequence work runs (mirrors migration 031/032/033's own
--     content-derived-id discipline).
--   visitor_canonical_event_witness   SOURCE OF TRUTH for Fact B
--     (visitor-scoped, per-actor): append-only, idempotent by
--     (world_instance_id, user_id, canonical_event_id) -- a visitor
--     witnessing the same completed event twice never produces a
--     second row. References Fact A's own `activation_id`, never
--     duplicates its content (mirrors `EncounterRecord.worldEventId`'s
--     own reference-only convention).
--
-- Every canonical event's own CONSEQUENCE (a CANONICAL_EVENT_OCCURRED
-- WorldEvent, a PLACE-domain AdaptationEffect) writes into an EXISTING
-- table with its own existing migration (world_events: migration 028;
-- adaptation_effects: migration 032) -- never a second, competing
-- consequence-storage path.

CREATE TABLE IF NOT EXISTS canonical_event_projection_state (
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  canonical_event_id text NOT NULL,
  -- Mirrors @avatark/canonical-event-contracts' own closed
  -- CanonicalEventProjectionStatus union exactly -- a CHECK constraint,
  -- not a free-form text column, so an invalid status can never be
  -- written even by a direct SQL statement bypassing the application
  -- layer.
  status text NOT NULL CHECK (status IN ('DORMANT', 'ELIGIBLE', 'ACTIVATED', 'PROJECTING', 'COMPLETED')),
  activation_id text,
  -- Array of MandatedFact, mirroring @avatark/canonical-event-contracts'
  -- own closed union exactly -- bounded by construction (one authored
  -- StudioK event never carries an unbounded fact list).
  mandated_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  scope jsonb NOT NULL,
  provenance jsonb NOT NULL,
  activated_at_tick integer,
  completed_at_tick integer,
  world_event_id text,
  PRIMARY KEY (world_instance_id, canonical_event_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS canonical_event_projection_state_by_activation ON canonical_event_projection_state (activation_id) WHERE activation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS visitor_canonical_event_witness (
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  canonical_event_id text NOT NULL,
  activation_id text NOT NULL,
  witnessed_at_tick integer NOT NULL,
  PRIMARY KEY (world_instance_id, user_id, canonical_event_id)
);

ALTER TABLE canonical_event_projection_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_canonical_event_witness ENABLE ROW LEVEL SECURITY;

-- `canonical_event_projection_state` is world-truth, same convention as
-- migrations 026-033's own: shared across every visitor, read-only for
-- authenticated clients, no client-side insert/update/delete policy at
-- all (RLS enabled + no policy for an operation = Postgres denies it
-- outright). The Host's own execution-owner process writes through the
-- service-role key, which bypasses RLS entirely.
DROP POLICY IF EXISTS "canonical_event_projection_state_read" ON canonical_event_projection_state;
CREATE POLICY "canonical_event_projection_state_read" ON canonical_event_projection_state FOR SELECT USING (true);

-- `visitor_canonical_event_witness` is visitor-scoped -- unlike every
-- other table in this migration set so far, a real production policy
-- would restrict SELECT to the owning user_id (matching the pattern
-- visitor-scoped tables in earlier migrations already establish for
-- account-owned data). No such policy is added here since no
-- authenticated-client read path for this table exists yet in this
-- environment; the table is prepared, not wired to any RLS-scoped
-- query. Read-only-for-service-role-only until that path exists.
DROP POLICY IF EXISTS "visitor_canonical_event_witness_read" ON visitor_canonical_event_witness;
CREATE POLICY "visitor_canonical_event_witness_read" ON visitor_canonical_event_witness FOR SELECT USING (false);

-- Neither table touches protected canonical narrative state -- there is
-- no column, FK, or join to it here, by design (mirrors every prior
-- sprint's own equivalent invariant: emergent/systemic state never
-- gains a write path to canon, and Canon itself is never stored
-- redundantly here -- only `canonical_event_id` +
-- `provenance->>'definitionContentHash'` are pointers, never a copy of
-- authored mandated-fact source text). See
-- docs/SPRINT18_FINAL_REPORT.md's security/authority section.
