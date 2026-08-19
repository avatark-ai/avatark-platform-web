export type { ArtifactReference } from "./artifactReference.ts"

export type { RuntimeRequirement, RuntimeCapabilities, ActivationCheck } from "./runtimeCapabilities.ts"
export { MINIMAL_RUNTIME_CAPABILITIES, checkActivation } from "./runtimeCapabilities.ts"

export type { PersistenceIntent, ActionOpportunity } from "./actionOpportunity.ts"

export type { NonActionEvidence, NonActionQualification } from "./nonActionQualification.ts"

export type { EvidenceActor, ObservedEvent, EvidenceCompleteness, EvidenceWindow, DerivationResult } from "./deriveNonActionQualification.ts"
export { deriveNonActionQualification } from "./deriveNonActionQualification.ts"

export type { ExpectationOrigin, ExpectationReference } from "./expectationReference.ts"

export type { ExpectedAbsenceFact } from "./expectedAbsenceFact.ts"

export type { ObservedOutcome, ExpectationEvaluationContext, ExpectationEvaluationResult } from "./expectationEvaluation.ts"
export { evaluateExpectation } from "./expectationEvaluation.ts"
