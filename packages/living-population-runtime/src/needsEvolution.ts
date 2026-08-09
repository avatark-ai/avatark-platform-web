import type { EnvironmentalBand, EnvironmentalState } from "@avatark/living-systems-contracts"
import type { NeedDefinition, NeedDimension, NeedState } from "@avatark/living-population-contracts"

// Generic, world-neutral band multiplier -- how much a given
// EnvironmentalBand accelerates ("increasing") or decelerates
// ("decreasing") a need's pressure accumulation. No world-specific
// value anywhere; a different world's own bands feed this identically
// (proven by livingForestPortability.test.ts's own reuse).
function bandMultiplier(band: EnvironmentalBand, direction: "increasing" | "decreasing"): number {
  const table = direction === "increasing" ? { low: 0.6, moderate: 1, high: 1.5 } : { low: 1.5, moderate: 1, high: 0.6 }
  return table[band]
}

// Sprint 10, Phase 3/9: deterministic, data-driven need evolution --
// not a biological simulation. Each dimension's pressure moves by
// EXACTLY ONE of two rules per tick:
//   - if this tick's selected behavior SATISFIES it: pressure falls by
//     a fixed relief amount, clamped at 0.
//   - otherwise: pressure rises by the profile's own baseline rate,
//     modulated by a genuine environmental multiplier (temperature for
//     thirst, vegetation activity for hunger -- Phase 9's own named
//     examples) -- never a flat, season-label-blind constant.
const RELIEF_AMOUNT = 0.35

function pressureMultiplier(dimension: NeedDimension, environment: EnvironmentalState): number {
  if (dimension === "thirst") return bandMultiplier(environment.weather.temperatureBand, "increasing")
  if (dimension === "hunger") return bandMultiplier(environment.ecology.vegetationActivityBand, "decreasing")
  return 1
}

export function evolveNeeds(params: { needs: NeedState[]; definitions: NeedDefinition[]; environment: EnvironmentalState; satisfiedDimensions: NeedDimension[] }): NeedState[] {
  const definitionByDimension = new Map(params.definitions.map((d) => [d.dimension, d]))

  return params.needs.map((need) => {
    const definition = definitionByDimension.get(need.dimension)
    if (!definition) return need

    if (params.satisfiedDimensions.includes(need.dimension)) {
      return { dimension: need.dimension, pressure: Math.max(0, need.pressure - RELIEF_AMOUNT) }
    }

    const rise = definition.baselinePressurePerTick * pressureMultiplier(need.dimension, params.environment)
    return { dimension: need.dimension, pressure: Math.min(1, need.pressure + rise) }
  })
}

export function isUrgent(need: NeedState, definitions: NeedDefinition[]): boolean {
  const definition = definitions.find((d) => d.dimension === need.dimension)
  return definition ? need.pressure >= definition.thresholds.urgentAbove : false
}
