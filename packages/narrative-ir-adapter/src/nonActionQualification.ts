import type { ArtifactReference } from "./artifactReference.ts"
import type { PersistenceIntent } from "./actionOpportunity.ts"

// The bounded, replayable evidence a qualification was derived from -- never
// a claim about why the subject didn't act, only that the window closed
// without the qualifying action occurring. `disqualifyingEventIds` is
// always empty on a QUALIFIED result; it is carried on the evidence record
// so a reader never has to take non-disqualification on faith.
export interface NonActionEvidence {
  openedAtTick: number
  closedAtTick: number
  disqualifyingEventIds: string[]
}

// A qualified opportunity closed without the qualifying action occurring.
// This is the entire claim -- it does not assert the subject's internal
// motivation, and it does not itself carry a score or reward.
export interface NonActionQualification {
  opportunityId: string
  subjectId: string
  contextId: string
  qualifiedAtTick: number
  evidence: NonActionEvidence
  artifactReference: ArtifactReference
  persistenceIntent?: PersistenceIntent
}
