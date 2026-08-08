import { bandAtLeast } from "@avatark/living-systems-contracts"
import type { AvailableEncounter, EncounterConditionBand, EncounterRule, EnvironmentalState, ProtectedNarrativeProjection } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"

function resolveBandValue(env: EnvironmentalState, band: EncounterConditionBand) {
  switch (band) {
    case "temperatureBand":
      return env.weather.temperatureBand
    case "precipitationBand":
      return env.weather.precipitationBand
    case "humidityBand":
      return env.weather.humidityBand
    case "hydrologyBand":
      return env.hydrology.hydrologyBand
    case "vegetationActivityBand":
      return env.ecology.vegetationActivityBand
    case "animalActivityBand":
      return env.ecology.animalActivityBand
  }
}

// Sprint 7, Phase 11: Shared World State (environment) + Location +
// (Visitor meaningful memory / Protected narrative constraints, per the
// params below) -> Available Encounter Set. Deterministic, declarative,
// data-driven -- no rule here is Vrindavan-specific; every rule comes
// from StudioK's own authored encounterRules[].
//
// Phase 10's protected-narrative boundary is enforced here, not just
// documented: a `narrative-protected` rule only ever surfaces when
// `protectedNarrative.resolved` is true -- i.e. when a real
// canonical-narrative system has actually granted it. Since no such
// system exists yet for Living Vrindavan, every `narrative-protected`
// rule stays unavailable no matter how favorable the environmental
// condition is. That is the correct, protective behavior, not a gap.
export function resolveAvailableEncounters(
  rules: EncounterRule[],
  locationId: LocationId,
  environment: EnvironmentalState,
  protectedNarrative: ProtectedNarrativeProjection,
): AvailableEncounter[] {
  return rules
    .filter((rule) => rule.locationId === locationId)
    .filter((rule) => (rule.category === "narrative-protected" ? protectedNarrative.resolved : true))
    .filter((rule) => bandAtLeast(resolveBandValue(environment, rule.condition.band), rule.condition.atLeast))
    .map((rule) => ({ ruleId: rule.id, locationId: rule.locationId, category: rule.category }))
}
