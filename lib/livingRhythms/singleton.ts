import { InMemoryPlaceRhythmRepository } from "@avatark/living-rhythms-runtime"

// Sprint 13: module-scoped, process-lifetime living-rhythms repository
// -- the same documented simplification every existing Host singleton
// already carries (no Postgres repository is wired up in this
// environment; see supabase/migrations/030_living_rhythms.sql for the
// prepared, unapplied real schema). Deliberately separate from every
// other sprint's own singletons -- living rhythms is its own domain.
export const placeRhythmRepository = new InMemoryPlaceRhythmRepository()
