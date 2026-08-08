export type { EncounterRuleId, EntityArchetypeId, EntityId, SeasonId } from "./ids.ts"

export type { EnvironmentalBand } from "./environmentalBand.ts"
export { ENVIRONMENTAL_BANDS, bandAtLeast, bandIndex } from "./environmentalBand.ts"

export type { SimulationWindow, WorldClock } from "./worldClock.ts"

export type { SeasonDefinition, SeasonEnvironmentalEnvelope, SeasonState } from "./season.ts"

export type { EcologyState, EnvironmentalState, HydrologyState, WeatherState } from "./environmentalState.ts"

export type { SharedWorldState } from "./sharedWorldState.ts"

export type { EntityArchetype, LivingEntityState } from "./entity.ts"

export type { AvailableEncounter, EncounterCategory, EncounterConditionBand, EncounterRule } from "./encounter.ts"

export type { ProtectedNarrativeProjection, ProtectedNarrativeStateRepository } from "./protectedNarrative.ts"
export { emptyProtectedNarrativeProjection } from "./protectedNarrative.ts"

export type { MeaningfulEncounterRef, VisitorWorldMemory } from "./visitorMemory.ts"
export { emptyVisitorWorldMemory } from "./visitorMemory.ts"

export type { WorldSystemEvent, WorldSystemEventRepository, WorldSystemEventType } from "./systemEvent.ts"

export type { VisitorContextProjection, WorldSnapshot, WorldSnapshotProvenance } from "./snapshot.ts"
export { freezeWorldSnapshot } from "./snapshot.ts"

export type { DeterministicVariationInput } from "./variation.ts"
export { deriveDeterministicVariation } from "./variation.ts"

export type { LivingEntityStateRepository, SharedWorldStateRepository, VisitorWorldMemoryRepository } from "./repositories.ts"
