import type { ArtifactReference } from "./artifactReference.ts"

// Carries the producer's persistence authority/lifetime intent without
// interpreting or writing it -- persistence ownership stays outside this
// package (world-persistence-runtime vs. living-os remains unresolved).
export interface PersistenceIntent {
  authority: string
  lifetime: string
}

// A bounded chance for a specific subject to perform a qualifying action in
// a context, established by a Rule in the canonical artifact. Deliberately
// generic: no assumption that the opportunity is timer-based -- it may close
// on the qualifying action itself, or on any other host-determined terminal
// boundary (exit, move-on, etc.). `openedAtTick` is a logical tick, never a
// wall-clock value.
export interface ActionOpportunity {
  id: string
  subjectId: string
  contextId: string
  qualifyingActionRef: string
  openedAtTick: number
  ruleId: string
  artifactReference: ArtifactReference
  persistenceIntent?: PersistenceIntent
}
