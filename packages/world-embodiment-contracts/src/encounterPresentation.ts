import type { EncounterCategory, EncounterRuleId } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 8: the OUTPUT presentation for an already-resolved
// AvailableEncounter (Living Systems, Sprint 7) -- this module never
// decides availability itself, only how an already-available encounter
// should present as an affordance.
export interface EncounterPresentation {
  ruleId: EncounterRuleId
  locationId: LocationId
  category: EncounterCategory
  interactionAffordance: string
}
