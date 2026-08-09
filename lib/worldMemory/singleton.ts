import { InMemoryEncounterHistoryRepository, InMemoryEntityMemoryRepository, InMemoryHistoricalMarkerRepository, InMemoryWorldEventRepository } from "@avatark/world-memory-runtime"

// Sprint 11: module-scoped, process-lifetime World Memory / Entity
// Memory repositories -- the same documented simplification every
// existing Host singleton already carries (no Postgres repository is
// wired up in this environment; see
// supabase/migrations/028_world_memory.sql for the prepared, unapplied
// real schema). Deliberately separate from every other sprint's own
// singletons (lib/worldPersistence/singleton.ts,
// lib/livingPopulation/singleton.ts) -- World Memory is its own domain.
export const worldEventRepository = new InMemoryWorldEventRepository()
export const entityMemoryRepository = new InMemoryEntityMemoryRepository()
export const historicalMarkerRepository = new InMemoryHistoricalMarkerRepository()
export const encounterHistoryRepository = new InMemoryEncounterHistoryRepository()
