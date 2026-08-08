import type { AvailableEncounter, EncounterCategory } from "@avatark/living-systems-contracts"
import type { EncounterPresentation } from "@avatark/world-embodiment-contracts"

// Sprint 8: maps an already-resolved AvailableEncounter (Living Systems
// decided availability -- this function never does) into a presentation
// affordance. The category->affordance mapping is STK-SPEC-005's own
// fixed five-value enum, not per-world data -- every world sharing that
// enum gets the same affordance vocabulary for free.
const CATEGORY_AFFORDANCE: Record<EncounterCategory, string> = {
  ambient: "notice",
  environmental: "observe",
  reflective: "reflect",
  "narrative-protected": "narrative",
  "practice-linked": "practice",
}

export function resolveEncounterPresentation(encounter: AvailableEncounter): EncounterPresentation {
  return {
    ruleId: encounter.ruleId,
    locationId: encounter.locationId,
    category: encounter.category,
    interactionAffordance: CATEGORY_AFFORDANCE[encounter.category],
  }
}
