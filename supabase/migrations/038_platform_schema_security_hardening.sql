-- AvatarK Platform — WORLDK-P11B: platform schema security hardening.
--
-- Forward-only. Changes no table, column, or policy predicate; only who a
-- policy/grant applies to. Enforces the authority model the earlier
-- migrations already document but, on a real Supabase project, did not
-- achieve: Supabase's default privileges grant anon + authenticated full
-- table privileges and EXECUTE on every new public table/function, so a
-- missing RLS enable, a policy left `TO public`, or a REVOKE ... FROM PUBLIC
-- alone is not enough there. (M09 proved 037 on a vanilla Postgres, which
-- has no such default grants.) Found by a schema audit of the P11B preview
-- project (avatark-platform-preview) after applying 001–035 + 037.
--
-- Lineage: 036 is 036_certification_authority.sql on the separate,
-- unlanded narrative-ir-adapter lineage. This migration does not depend on
-- it; a database may legitimately hold 001–035, 037, 038 without 036.

-- 1. territory_claims (migration 033) was created with no RLS at all,
--    leaving it readable AND writable by anon. 033 documents no client
--    read or write path, and no code reads it through a Supabase client
--    (InMemoryTerritoryClaimRepository is the only implementation), so it
--    fails closed: server-only, written/read through the service-role key.
ALTER TABLE territory_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON territory_claims FROM anon, authenticated;

-- 2. schema_migrations is supabase/scripts/run-platform-migrations.js's
--    ledger, not application data. The runner connects as the table
--    owner, which RLS does not restrict. Guarded because a database
--    migrated by another tool may not have this table.
DO $$
BEGIN
  IF to_regclass('public.schema_migrations') IS NOT NULL THEN
    ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.schema_migrations FROM anon, authenticated;
  END IF;
  IF to_regclass('public.schema_migrations_migration_id_seq') IS NOT NULL THEN
    REVOKE ALL ON SEQUENCE public.schema_migrations_migration_id_seq FROM anon, authenticated;
  END IF;
END $$;

-- 3. Migration 037 documents its two SECURITY DEFINER writers as
--    "executable by service_role alone". REVOKE ... FROM PUBLIC did not
--    remove Supabase's direct anon/authenticated EXECUTE grants, so any
--    anon-key holder could record entry/leave for an arbitrary subject via
--    /rest/v1/rpc.
REVOKE EXECUTE ON FUNCTION record_world_confirmed_entry(text, uuid, timestamptz, integer, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION record_world_leave(text, uuid, timestamptz, integer, text) FROM anon, authenticated;

-- 4. Migrations 026–032 and 034 document their shared world-state read
--    policies as "read-only for authenticated clients", but created them
--    without a TO clause (i.e. TO public), so anon could read them too.
--    Scope them to authenticated; the USING (true) predicate is unchanged.
ALTER POLICY "world_instances_read" ON world_instances TO authenticated;
ALTER POLICY "durable_world_shared_state_read" ON durable_world_shared_state TO authenticated;
ALTER POLICY "living_entity_state_read" ON living_entity_state TO authenticated;
ALTER POLICY "world_checkpoints_read" ON world_checkpoints TO authenticated;
ALTER POLICY "world_system_events_read" ON world_system_events TO authenticated;
ALTER POLICY "world_leases_read" ON world_leases TO authenticated;
ALTER POLICY "world_lifecycle_read" ON world_lifecycle TO authenticated;
ALTER POLICY "entity_behavior_state_read" ON entity_behavior_state TO authenticated;
ALTER POLICY "group_state_read" ON group_state TO authenticated;
ALTER POLICY "world_events_read" ON world_events TO authenticated;
ALTER POLICY "entity_memory_entries_read" ON entity_memory_entries TO authenticated;
ALTER POLICY "historical_markers_read" ON historical_markers TO authenticated;
ALTER POLICY "encounter_history_entries_read" ON encounter_history_entries TO authenticated;
ALTER POLICY "relationships_read" ON relationships TO authenticated;
ALTER POLICY "group_memberships_read" ON group_memberships TO authenticated;
ALTER POLICY "familiarity_states_read" ON familiarity_states TO authenticated;
ALTER POLICY "home_ranges_read" ON home_ranges TO authenticated;
ALTER POLICY "separations_read" ON separations TO authenticated;
ALTER POLICY "place_rhythm_profiles_read" ON place_rhythm_profiles TO authenticated;
ALTER POLICY "encounter_records_read" ON encounter_records TO authenticated;
ALTER POLICY "adaptation_pressure_read" ON adaptation_pressure TO authenticated;
ALTER POLICY "adaptation_effects_read" ON adaptation_effects TO authenticated;
ALTER POLICY "canonical_event_projection_state_read" ON canonical_event_projection_state TO authenticated;
