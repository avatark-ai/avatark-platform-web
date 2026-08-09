export { deriveMemoryRecordId } from "./eventIdentity.ts"

export type { SignificanceConfig, WorldEventCandidate } from "./significance.ts"
export { DEFAULT_SIGNIFICANCE_CONFIG, evaluateSignificance } from "./significance.ts"

export type { CompactionResult } from "./retentionPolicy.ts"
export { DEFAULT_RETENTION_POLICY, ageRetentionTier, compactWorldEvents, initialRetentionTier } from "./retentionPolicy.ts"

export type { DeriveWorldEventsParams } from "./worldEventDerivation.ts"
export { deriveWorldEvents } from "./worldEventDerivation.ts"

export { deriveEntityMemoryEntries } from "./entityMemoryDerivation.ts"

export { resolvePreferredResourceLocation } from "./memoryInfluence.ts"

export type { EmergentEncounterRule, ResolveEmergentEncounterOpportunitiesParams } from "./emergentEncounters.ts"
export { resolveEmergentEncounterOpportunities } from "./emergentEncounters.ts"

export { recordEncounterResolved, trackEncounterHistory } from "./encounterHistory.ts"

export { computeReturnRecognition } from "./returnRecognition.ts"

export { InMemoryEncounterHistoryRepository, InMemoryEntityMemoryRepository, InMemoryHistoricalMarkerRepository, InMemoryWorldEventRepository } from "./inMemoryRepositories.ts"
