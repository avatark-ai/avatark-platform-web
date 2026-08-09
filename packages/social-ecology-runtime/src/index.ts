export type { FamiliarityThresholds } from "./familiarityEvolution.ts"
export { DEFAULT_FAMILIARITY_THRESHOLDS, deriveFamiliarityBand, evolveFamiliarity } from "./familiarityEvolution.ts"

export { deriveRelationshipBand, evolveRelationshipEvidence } from "./relationshipEvolution.ts"

export type { EvaluateSeparationTransitionParams, SeparationTransitionResult } from "./separationReunion.ts"
export { evaluateSeparationTransition } from "./separationReunion.ts"

export type { ResolveSocialPerceptionParams } from "./socialPerception.ts"
export { resolveSocialPerception } from "./socialPerception.ts"

export { resolvePlaceAttachment } from "./territory.ts"

export {
  InMemoryFamiliarityRepository,
  InMemoryGroupMembershipRepository,
  InMemoryHomeRangeRepository,
  InMemoryRelationshipRepository,
  InMemorySeparationRepository,
} from "./inMemoryRepositories.ts"
