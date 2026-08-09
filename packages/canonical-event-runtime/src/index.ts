export { deriveCanonicalActivationId, deriveDefinitionContentHash } from "./activationIdentity.ts"

export type { CanonicalEventEligibilityContext } from "./eligibility.ts"
export { evaluateCanonicalEventEligibility } from "./eligibility.ts"

export type { ResolveCanonicalEventActivationParams } from "./activation.ts"
export { resolveCanonicalEventActivation } from "./activation.ts"

export { InMemoryWorldInstanceCanonicalProjectionStateRepository, InMemoryVisitorCanonicalEventWitnessRepository } from "./inMemoryRepositories.ts"
