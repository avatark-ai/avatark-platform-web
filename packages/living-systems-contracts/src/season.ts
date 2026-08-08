import type { EnvironmentalBand } from "./environmentalBand.ts"
import type { SeasonId } from "./ids.ts"

// StudioK-authored simulation intent (mirrors living-systems.schema.json's
// seasons[] field-for-field) -- a Living Systems runtime executes this,
// it never invents it. `canonId` is the only Canon-authority pointer;
// content stays in Canon, never duplicated here beyond the name a
// SeasonDefinition itself needs at runtime.
export interface SeasonEnvironmentalEnvelope {
  temperatureBand: EnvironmentalBand
  precipitationBand: EnvironmentalBand
  humidityBand: EnvironmentalBand
  hydrologyBaselineBand: EnvironmentalBand
  vegetationActivityBand: EnvironmentalBand
  animalActivityBand: EnvironmentalBand
}

export interface SeasonDefinition {
  id: SeasonId
  name: string
  order: number
  canonId: string
  environmentalEnvelope: SeasonEnvironmentalEnvelope
  minDurationTicks: number
  /** A consumer runtime derives seasonal-transition legality from this
   * array -- it must never hardcode a world-specific rule (e.g. "if
   * vasanta then grishma"), exactly the same restraint
   * @avatark/living-world-runtime already applies to location graphs. */
  allowedNextSeasonIds: SeasonId[]
}

// Runtime state: which season is current, and since when -- nothing
// else. The environmental *content* of being in that season lives in the
// SeasonDefinition it points at, never duplicated here.
export interface SeasonState {
  currentSeasonId: SeasonId
  enteredAtTick: number
}
