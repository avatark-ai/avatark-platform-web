import type { EncounterRuleId, EntityId } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"
import type { RelationshipId } from "@avatark/social-ecology-contracts"
import type { EncounterConsequence, EncounterRealizationStatus } from "@avatark/encounter-realization-contracts"

export interface DeriveConsequencesParams {
  status: EncounterRealizationStatus
  ruleId: EncounterRuleId
  locationId: LocationId
  participantEntityIds: EntityId[]
  // Any relationship whose two entities are BOTH among the participants
  // -- resolved by the Host layer from Sprint 12's own RelationshipState,
  // never recomputed here.
  relationshipIdsInvolved: RelationshipId[]
}

// Sprint 14, Phase 8: pure and bounded -- exactly one WORLD_MEMORY
// RESOURCE_PREFERENCE consequence per participant (the SAME consequence
// type POPULATION_MOVEMENT already attaches per member,
// world-memory-runtime's own worldEventDerivation.ts), one
// LOCATION_HISTORY_MARKER for the place, and one RELATIONSHIP
// ENCOUNTER_EVIDENCE consequence per relationship actually involved.
// Nothing is derived for a non-REALIZED status -- EXPIRED/BLOCKED
// encounters never fabricate a consequence (the mission's own explicit
// requirement).
export function deriveConsequences(params: DeriveConsequencesParams): EncounterConsequence[] {
  if (params.status !== "REALIZED") return []

  const consequences: EncounterConsequence[] = []

  for (const entityId of params.participantEntityIds) {
    consequences.push({ domain: "WORLD_MEMORY", worldConsequence: { type: "RESOURCE_PREFERENCE", targetEntityId: entityId, targetGroupId: null, targetLocationId: params.locationId, detail: {} } })
  }

  consequences.push({ domain: "WORLD_MEMORY", worldConsequence: { type: "LOCATION_HISTORY_MARKER", targetEntityId: null, targetGroupId: null, targetLocationId: params.locationId, detail: { reason: "encounter_realized", ruleId: params.ruleId } } })

  for (const relationshipId of params.relationshipIdsInvolved) {
    consequences.push({ domain: "RELATIONSHIP", relationshipId, kind: "ENCOUNTER_EVIDENCE" })
  }

  return consequences
}
