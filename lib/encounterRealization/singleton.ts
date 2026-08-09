import { InMemoryEncounterRecordRepository } from "@avatark/encounter-realization-runtime"

// Sprint 14: module-scoped, process-lifetime encounter-record repository
// -- the same documented simplification every existing Host singleton
// already carries (no Postgres repository is wired up in this
// environment; see supabase/migrations/031_encounter_realization.sql
// for the prepared, unapplied real schema).
export const encounterRecordRepository = new InMemoryEncounterRecordRepository()
