import type { EntityId } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"
import type { CausalReference, MemorySignificance, WorldEventCategory } from "@avatark/world-memory-contracts"

// Sprint 11, Phase 3: the deterministic significance filter -- the
// system's own distinction between a raw state change and a
// historically meaningful one. Every branch is a plain, inspectable
// rule; nothing here is probabilistic, learned, or LLM-decided.
export interface WorldEventCandidate {
  category: WorldEventCategory
  tick: number
  locationId: LocationId | null
  participantEntityIds: EntityId[]
  causalReferences: CausalReference[]
  detail: Record<string, string | number | boolean>
}

// World-grammar configurable (Phase 3's own requirement): which bands
// count as "scarcity" for the ENVIRONMENTAL_THRESHOLD rule. Defaults to
// the one value every existing environmental band vocabulary already
// uses for its low end -- a different world's own grammar can supply a
// different list without this function changing.
export interface SignificanceConfig {
  scarcityBands: string[]
}

export const DEFAULT_SIGNIFICANCE_CONFIG: SignificanceConfig = { scarcityBands: ["low"] }

export function evaluateSignificance(candidate: WorldEventCandidate, config: SignificanceConfig = DEFAULT_SIGNIFICANCE_CONFIG): MemorySignificance {
  switch (candidate.category) {
    case "SEASON_TRANSITION":
    case "GROUP_FORMED":
    case "GROUP_DISPERSED":
      // Rare, structurally important transitions -- always worth
      // remembering at full fidelity, never compacted (retention.ts).
      return "LANDMARK"

    case "ENVIRONMENTAL_THRESHOLD": {
      // "water band changes slightly -> probably not; crosses a
      // meaningful threshold -> may create World Memory" (mission's own
      // example) -- meaningful only when the band enters or leaves a
      // configured scarcity value, never on every band change.
      const from = String(candidate.detail.fromBand ?? "")
      const to = String(candidate.detail.toBand ?? "")
      if (from === to) return "NOT_SIGNIFICANT"
      const crossesScarcity = config.scarcityBands.includes(from) || config.scarcityBands.includes(to)
      return crossesScarcity ? "MEANINGFUL" : "NOT_SIGNIFICANT"
    }

    case "RESOURCE_CONDITION_CHANGED":
    case "LOCATION_CONDITION_CHANGED": {
      // Meaningful only on an actual availability FLIP, never a
      // same-state re-confirmation.
      const wasAvailable = Boolean(candidate.detail.wasAvailable)
      const isAvailable = Boolean(candidate.detail.isAvailable)
      return wasAvailable !== isAvailable ? "MEANINGFUL" : "NOT_SIGNIFICANT"
    }

    case "POPULATION_MOVEMENT":
      // "one cow performs routine grazing -> probably not; herd
      // relocates because its prior water resource became unavailable
      // -> potentially meaningful" -- only a GROUP-level relocation
      // (never an individual's routine move) is significant here.
      return candidate.detail.isGroupRelocation === true ? "MEANINGFUL" : "NOT_SIGNIFICANT"

    case "ENTITY_ACTIVITY_TRANSITION":
      // Too frequent to be history on its own -- the meaningful
      // consequence of an activity change (a group relocating because
      // of it) is captured by POPULATION_MOVEMENT instead.
      return "NOT_SIGNIFICANT"

    case "ENCOUNTER_BECAME_AVAILABLE":
    case "ENCOUNTER_RESOLVED":
      return "MEANINGFUL"

    default:
      return "NOT_SIGNIFICANT"
  }
}
