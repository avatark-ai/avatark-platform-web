import { InMemoryEntityBehaviorStateRepository, InMemoryGroupStateRepository } from "@avatark/living-population-runtime"
import { InMemoryEncounterRecordRepository } from "@avatark/encounter-realization-runtime"
import { InMemoryEntityMemoryRepository, InMemoryWorldEventRepository } from "@avatark/world-memory-runtime"
import { InMemoryParticipationRecordRepository } from "@avatark/participation-runtime"
import { InMemoryWorldLeaseRepository } from "@avatark/world-persistence-runtime"

// Fresh, isolated, in-memory repository set for one Living Forest world
// session -- mirrors the SAME "no Postgres repository yet, module- or
// call-scoped process-lifetime store" simplification every existing
// `lib/*/singleton.ts` file already documents for Living Vrindavan
// (e.g. lib/livingSystems/singleton.ts), except deliberately NOT a
// module-scoped singleton here: each test/session constructs its own
// set via `createLivingForestRepositories()` so parallel proofs (e.g.
// the determinism replay, which runs the identical scenario twice)
// never share mutable state by accident.
export function createLivingForestRepositories() {
  return {
    behaviorStates: new InMemoryEntityBehaviorStateRepository(),
    groups: new InMemoryGroupStateRepository(),
    encounterRecords: new InMemoryEncounterRecordRepository(),
    entityMemory: new InMemoryEntityMemoryRepository(),
    worldEvents: new InMemoryWorldEventRepository(),
    participationRecords: new InMemoryParticipationRecordRepository(),
    lease: new InMemoryWorldLeaseRepository(),
  }
}

export type LivingForestRepositories = ReturnType<typeof createLivingForestRepositories>
