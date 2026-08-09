import { InMemoryParticipationRecordRepository } from "@avatark/participation-runtime"

// Sprint 19: module-scoped, process-lifetime participation-record store
// -- the same documented simplification every existing Host singleton
// already carries (no Postgres repository is wired up in this
// environment; see supabase/migrations/035_participation.sql for the
// prepared, unapplied real schema).
export const participationRecordRepository = new InMemoryParticipationRecordRepository()
