import type { LocationId } from "@avatark/runtime-contracts"
import type { EnvironmentalBand } from "./environmentalBand.ts"
import type { EncounterRuleId } from "./ids.ts"

export type EncounterCategory = "ambient" | "environmental" | "reflective" | "narrative-protected" | "practice-linked"

export type EncounterConditionBand = "temperatureBand" | "precipitationBand" | "humidityBand" | "hydrologyBand" | "vegetationActivityBand" | "animalActivityBand"

// StudioK-authored rule (mirrors living-systems.schema.json's
// encounterRules[] field-for-field) -- declarative and data-driven so a
// consumer runtime never hardcodes world-specific encounter logic.
// Deliberately a single-condition threshold; a richer condition grammar
// is a future schema revision, not something to invent here.
export interface EncounterRule {
  id: EncounterRuleId
  locationId: LocationId
  category: EncounterCategory
  condition: { band: EncounterConditionBand; atLeast: EnvironmentalBand }
}

// A resolved, currently-available encounter -- the OUTPUT of evaluating
// EncounterRule[] against resolved environmental state (Phase 11), never
// authored directly.
export interface AvailableEncounter {
  ruleId: EncounterRuleId
  locationId: LocationId
  category: EncounterCategory
}
