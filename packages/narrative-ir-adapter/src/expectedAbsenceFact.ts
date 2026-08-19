import type { ArtifactReference } from "./artifactReference.ts"
import type { PersistenceIntent } from "./actionOpportunity.ts"
import type { ExpectationOrigin } from "./expectationReference.ts"

// A qualified expectation closed with the actual state deviating beyond its
// pattern window, with sufficient authored basis and complete evidence.
// This is the entire claim -- it carries no cause, no score, and no claim
// about why the state differs (causal humility: see evaluateExpectation.ts).
export interface ExpectedAbsenceFact {
  expectationId: string
  subjectId: string
  property: string
  origin: ExpectationOrigin
  evidenceStateIds: string[]
  logicalTick: number
  disconfirmationCount: number
  artifactReference: ArtifactReference
  persistenceIntent?: PersistenceIntent
}
