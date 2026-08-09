import { InMemoryVisitorCanonicalEventWitnessRepository, InMemoryWorldInstanceCanonicalProjectionStateRepository } from "@avatark/canonical-event-runtime"

// Sprint 18: module-scoped, process-lifetime canonical-event-projection
// repositories -- the same documented simplification every existing
// Host singleton already carries (no Postgres repository is wired up in
// this environment; see supabase/migrations/034_canonical_events.sql
// for the prepared, unapplied real schema).
export const canonicalProjectionStateRepository = new InMemoryWorldInstanceCanonicalProjectionStateRepository()
export const visitorCanonicalEventWitnessRepository = new InMemoryVisitorCanonicalEventWitnessRepository()
