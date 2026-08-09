import type { CausalReference } from "@avatark/world-memory-contracts"
import type { AdaptationSignal } from "@avatark/world-adaptation-contracts"

// Sprint 15: plain, structured facts the Host layer already knows this
// wake from Sprint 14's own encounter-realization result -- this
// package never recomputes or re-derives them, only converts them into
// bounded signals (the same "World Memory REACTS to structured deltas"
// discipline `worldEventDerivation.ts`'s own DeriveWorldEventsParams
// already established for its domain).
export interface RealizedEncounterSignalInput {
  ruleId: string
  locationId: string
  participantEntityIds: string[]
  relationshipIdsInvolved: string[]
  tick: number
  causalReferences: CausalReference[]
}

// A single, current resource-opportunity reading (living-rhythms-runtime's
// own ResourceOpportunity, restated structurally so this package never
// imports a sibling runtime's contracts package it doesn't otherwise
// need) for one (locationId, category) pair, this wake.
export interface ResourceReadingSignalInput {
  locationId: string
  category: string
  available: boolean
  tick: number
}

export interface DeriveAdaptationSignalsParams {
  realizedEncounters: RealizedEncounterSignalInput[]
  resourceReadings: ResourceReadingSignalInput[]
}

// Sprint 15, mission's own "ADAPTATION INPUTS" section: exactly four
// signal-producing rules, each a plain restatement of an existing fact,
// never invented. A realized encounter produces one ENTITY signal per
// participant, one RELATIONSHIP signal per relationship actually
// involved, one PLACE signal for the location, and one WORLD_POSSIBILITY
// signal for the rule itself (bounded, deterministic, mirrors
// @avatark/encounter-realization-runtime's own `deriveConsequences`
// bounded-per-participant/per-relationship shape). A resource reading
// produces exactly one PLACE signal, keyed by the composite
// `${locationId}:${category}` subject.
export function deriveAdaptationSignals(params: DeriveAdaptationSignalsParams): AdaptationSignal[] {
  const signals: AdaptationSignal[] = []

  for (const encounter of params.realizedEncounters) {
    for (const entityId of encounter.participantEntityIds) {
      signals.push({ domain: "ENTITY", subjectId: entityId, kind: "ENCOUNTER_INVOLVEMENT", tick: encounter.tick, weight: 1, causalReferences: encounter.causalReferences })
    }
    for (const relationshipId of encounter.relationshipIdsInvolved) {
      signals.push({ domain: "RELATIONSHIP", subjectId: relationshipId, kind: "ENCOUNTER_EVIDENCE", tick: encounter.tick, weight: 1, causalReferences: encounter.causalReferences })
    }
    signals.push({ domain: "PLACE", subjectId: encounter.locationId, kind: "ENCOUNTER_INVOLVEMENT", tick: encounter.tick, weight: 1, causalReferences: encounter.causalReferences })
    signals.push({ domain: "WORLD_POSSIBILITY", subjectId: encounter.ruleId, kind: "ENCOUNTER_INVOLVEMENT", tick: encounter.tick, weight: 1, causalReferences: encounter.causalReferences })
  }

  for (const reading of params.resourceReadings) {
    const subjectId = `${reading.locationId}:${reading.category}`
    const causalReferences: CausalReference[] = [{ kind: "resource", ref: `${reading.category}:${reading.available ? "available" : "unavailable"}` }]
    signals.push({ domain: "PLACE", subjectId, kind: reading.available ? "RESOURCE_ABUNDANCE" : "RESOURCE_SCARCITY", tick: reading.tick, weight: 1, causalReferences })
  }

  return signals
}
