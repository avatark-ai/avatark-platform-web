import { InMemoryAdaptationEffectRepository, InMemoryAdaptationPressureRepository } from "@avatark/world-adaptation-runtime"

// Sprint 15: module-scoped, process-lifetime adaptation repositories --
// the same documented simplification every existing Host singleton
// already carries (no Postgres repository is wired up in this
// environment; see supabase/migrations/032_world_adaptation.sql for the
// prepared, unapplied real schema).
export const adaptationPressureRepository = new InMemoryAdaptationPressureRepository()
export const adaptationEffectRepository = new InMemoryAdaptationEffectRepository()
