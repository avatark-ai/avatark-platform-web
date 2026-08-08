export { advanceClock, pauseClock, resumeClock } from "./worldClock.ts"

export { deriveEcology, deriveHydrology, deriveWeather } from "./causalEnvironment.ts"

export { findSeasonDefinition, resolveSeasonTransition } from "./seasonTransition.ts"

export { advanceEntityLifecycle } from "./entityLifecycle.ts"

export { resolveAvailableEncounters } from "./encounterResolution.ts"

export type { ResolveWorldSnapshotParams } from "./snapshotResolver.ts"
export { resolveWorldSnapshot } from "./snapshotResolver.ts"

export type { AdvanceWorldSimulationParams, AdvanceWorldSimulationResult } from "./simulation.ts"
export { advanceWorldSimulation } from "./simulation.ts"

export {
  InMemoryLivingEntityStateRepository,
  InMemoryProtectedNarrativeStateRepository,
  InMemorySharedWorldStateRepository,
  InMemoryVisitorWorldMemoryRepository,
  InMemoryWorldSystemEventRepository,
} from "./inMemoryRepositories.ts"
