import type { EnvironmentalState } from "@avatark/living-systems-contracts"
import type { LocationResourceAffordance, ResourceTag } from "@avatark/living-population-contracts"
import type { ResourceOpportunity } from "@avatark/living-rhythms-contracts"

// Sprint 13, Phase 4: a deliberate, documented RESTATEMENT of
// `living-population-runtime`'s own perception.ts water/vegetation
// gating rule -- the same "second, independent implementation of a
// similar rule" posture Sprint 11's own `computeLocationConditionsByCategory`
// already used, never a shared-library extraction (see
// docs/SPRINT13_GROUND_TRUTH.md's decision 2). Extended with two new
// categories ("rest", "corridor") and their own restrained, single-band
// causal gates -- "gathering" alone has no environmental gate (an open
// communal space is not degraded by weather in this reference model).
function isResourceAvailable(category: ResourceTag, environment: EnvironmentalState): boolean {
  switch (category) {
    case "water":
      return environment.hydrology.hydrologyBand !== "low"
    case "vegetation":
    case "shelter":
      return environment.ecology.vegetationActivityBand !== "low"
    case "gathering":
      return true
    case "rest":
      return environment.weather.temperatureBand !== "high"
    case "corridor":
      return environment.weather.precipitationBand !== "high"
  }
}

export function resolveResourceOpportunities(affordances: LocationResourceAffordance[], environment: EnvironmentalState, tick: number): ResourceOpportunity[] {
  return affordances.flatMap((affordance) => affordance.resourceTags.map((category) => ({ locationId: affordance.locationId, category, available: isResourceAvailable(category, environment), tick })))
}
