import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 18, Phase 0 §10: a mandated fact is a semantic assertion,
// never a renderer instruction -- "ENTITY MUST BE PRESENT" is
// mandated-fact-shaped; "RENDER ENTITY AT XYZ" is not. Everything NOT
// listed here is a SIMULATED consequence, resolved by the existing
// systems (encounter realization, social ecology, adaptation) exactly
// as today -- this closed union never grows a second consequence
// engine, only ever hands semantic stimuli to systems that already own
// consequence derivation.
export type MandatedFact =
  | { kind: "PARTICIPANT_PRESENT"; participantRef: string }
  | { kind: "LOCATION_ACTIVE"; locationId: LocationId }
  | { kind: "ENVIRONMENTAL_STATE"; stateRef: string }
