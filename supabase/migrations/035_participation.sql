-- AvatarK Platform — Sprint 19: Visitor <-> Living World Participation
-- durable state (PROPOSAL -- registered in
-- supabase/scripts/run-platform-migrations.js's MIGRATION_ORDER for
-- traceability, but NOT APPLIED to any real database in this
-- environment, matching migrations 023/026-034's own precedent.
-- @avatark/participation-runtime's own InMemoryParticipationRecordRepository
-- and @avatark/private-reflection-runtime's own
-- InMemoryPrivateReflectionRepository reference adapters are the only
-- implementations actually exercised this sprint.)
--
-- Backs @avatark/participation-contracts' own ParticipationRecordRepository
-- and @avatark/private-reflection-contracts' own
-- PrivateReflectionRecordRepository interfaces: two tables,
-- `participation_records` and `private_reflections`.
--
-- Source of truth vs consequence:
--   participation_records   the visitor's own durable, additive claim to
--     an already-legitimate, world-resolved encounter -- never a second
--     consequence-derivation authority. `encounter_record_id` is a
--     reference-only pointer into the EXISTING `encounter_records` table
--     (migration 031), nullable (honestly null when only Sprint 7's
--     coarse AvailableEncounter layer had resolved at creation time --
--     see docs/SPRINT19_FINAL_REPORT.md's persistence-semantics
--     section). Idempotent by `id`, content-derived
--     (`deriveParticipationRecordId`, sha256 over worldId | userId |
--     ruleId | locationId | tick), the same discipline migration
--     031/032/033/034's own tables already hold.
--   private_reflections   append-only, owner-scoped ONLY -- the private-
--     reflection firewall's durable half. No column here ever
--     references world_events, entity_memory_entries, adaptation_effects,
--     or any other simulation-truth table; this table is never joined
--     by, or exposed to, any consequence-deriving query. See
--     docs/SPRINT19_FINAL_REPORT.md's private-reflection-firewall-proof
--     section for the structural (not merely RLS-level) half of this
--     guarantee -- no runtime package outside
--     @avatark/private-reflection-runtime ever imports this domain at
--     all.
--
-- Every participation's own bounded consequence (a real EncounterRecord,
-- its own WorldEvent/AdaptationEffect) writes into an EXISTING table with
-- its own existing migration (encounter_records: migration 031;
-- world_events: migration 028; adaptation_effects: migration 032) --
-- never a second, competing consequence-storage path. Participation
-- introduces exactly one new write surface: the additive
-- `participation_records` row itself.

CREATE TABLE IF NOT EXISTS participation_records (
  id text PRIMARY KEY,
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  rule_id text NOT NULL,
  location_id text NOT NULL,
  -- Informational context only -- entities present at location_id, per
  -- durable world state, at the moment this record was created. No
  -- consequence-deriving query anywhere reads this column; it exists for
  -- the visitor's own record, never as an authority.
  participant_entity_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  tick integer NOT NULL,
  encounter_record_id text REFERENCES encounter_records(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS participation_records_by_user ON participation_records (world_instance_id, user_id);

CREATE TABLE IF NOT EXISTS private_reflections (
  id text PRIMARY KEY,
  world_instance_id text NOT NULL REFERENCES world_instances(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  location_id text NOT NULL,
  reflection_id text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS private_reflections_by_owner ON private_reflections (world_instance_id, user_id);

ALTER TABLE participation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_reflections ENABLE ROW LEVEL SECURITY;

-- `participation_records` is visitor-scoped, unlike canonical_event_projection_state
-- (migration 034, world-truth): a real production policy restricts
-- SELECT to the owning user_id -- the same pattern visitor-scoped tables
-- in earlier migrations already establish.
DROP POLICY IF EXISTS "participation_records_owner_read" ON participation_records;
CREATE POLICY "participation_records_owner_read" ON participation_records FOR SELECT USING (auth.uid()::text = user_id);

-- `private_reflections` is the firewall's durable half: owner-only,
-- with deliberately NO service-role read policy carve-out and no
-- SELECT USING (true) path of any kind -- unlike every world-truth
-- table in this migration set, there is no legitimate reason for ANY
-- other principal, including this environment's own backend service
-- role in a real deployment, to read a visitor's private content in
-- bulk. Only the owning user_id may ever read their own rows.
DROP POLICY IF EXISTS "private_reflections_owner_read" ON private_reflections;
CREATE POLICY "private_reflections_owner_read" ON private_reflections FOR SELECT USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "private_reflections_owner_insert" ON private_reflections;
CREATE POLICY "private_reflections_owner_insert" ON private_reflections FOR INSERT WITH CHECK (auth.uid()::text = user_id);
