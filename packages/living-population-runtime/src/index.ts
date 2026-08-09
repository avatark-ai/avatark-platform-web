export type { DirectedEdge } from "./locationGraph.ts"
export { buildUndirectedLocationGraph, reachableNeighbors } from "./locationGraph.ts"

export { resolveRhythmPhase } from "./rhythm.ts"

export { evolveNeeds, isUrgent } from "./needsEvolution.ts"

export type { ResolvePerceptionParams } from "./perception.ts"
export { resolvePerception } from "./perception.ts"

export type { SelectBehaviorParams, MemoryHint } from "./behaviorSelection.ts"
export { selectBehavior } from "./behaviorSelection.ts"

export { IllegalMovementError, resolveMovementIntent } from "./movementResolution.ts"

export type { AdvanceGroupStateParams } from "./groupDynamics.ts"
export { advanceGroupState } from "./groupDynamics.ts"

export type { AdvancePopulationSimulationParams, AdvancePopulationSimulationResult } from "./populationSimulation.ts"
export { advancePopulationSimulation, computeEncounterOpportunities } from "./populationSimulation.ts"

export { resolvePopulationSnapshot } from "./snapshotResolver.ts"

export { InMemoryEntityBehaviorStateRepository, InMemoryGroupStateRepository } from "./inMemoryRepositories.ts"
