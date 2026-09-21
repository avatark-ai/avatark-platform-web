import type { ArtifactReference } from "./artifactReference.ts"
import type { PersistenceIntent } from "./actionOpportunity.ts"

// Reproduces the canonical producer's own expectation-origin vocabulary
// verbatim -- WORLD_PATTERN is the shared-world register (evidenced
// independent of any one consumer), OBSERVER_KNOWLEDGE is a specific
// consumer's own register. The two must never be merged; both survive
// unchanged into any derived fact (see expectedAbsenceFact.ts).
export type ExpectationOrigin = "WORLD_PATTERN" | "OBSERVER_KNOWLEDGE"

// References a canonical Expectation node without duplicating the whole
// artifact. `patternEvidence` is the compiled, authored relational basis
// (states[].id references) -- a fixed list resolved at compile time, never
// something this package queries history to (re)establish.
export interface ExpectationReference {
  expectationId: string
  subjectId: string
  property: string
  origin: ExpectationOrigin
  // STK-WO-009 Phase C (G10C-3): the source ExpectedPatternState's own
  // irVersion, carried through unchanged -- see canonicalNarrativeIR.ts's
  // CanonicalExpectedPatternState comment for why this was previously lost.
  irVersion: string
  patternEvidence: readonly string[]
  artifactReference: ArtifactReference
  persistenceIntent?: PersistenceIntent
}
