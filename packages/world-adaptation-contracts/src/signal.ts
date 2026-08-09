import type { CausalReference } from "@avatark/world-memory-contracts"
import type { AdaptationDomain } from "./domain.ts"

// Sprint 15: a small, closed vocabulary of what CAN become an
// AdaptationSignal -- one unit of raw evidence observed during a single
// wake, never a raw tick and never psychology. Each kind is a plain
// restatement of a fact an existing Sprint 7-14 source already
// authoritatively produced this same wake (a realized encounter's own
// participants/location/relationships, or a resource opportunity
// reading) -- this package never recomputes or invents that fact, only
// converts it into a bounded, weighted signal.
export type AdaptationSignalKind = "ENCOUNTER_INVOLVEMENT" | "ENCOUNTER_EVIDENCE" | "RESOURCE_SCARCITY" | "RESOURCE_ABUNDANCE"

// `subjectId` is deliberately a plain string reused from an EXISTING
// identity space -- an EntityId, a RelationshipId, a LocationId, an
// EncounterRuleId, or (for a per-resource-category place reading) a
// composite `${locationId}:${category}` key -- never a new identity
// this package mints itself.
export interface AdaptationSignal {
  domain: AdaptationDomain
  subjectId: string
  kind: AdaptationSignalKind
  tick: number
  // A small, bounded weight (typically 1) -- never an unbounded score.
  // Multiple signals at the same tick for the same (domain, subjectId,
  // kind) simply sum before being applied to AdaptationPressure.
  weight: number
  causalReferences: CausalReference[]
}
