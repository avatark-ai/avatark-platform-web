import type { EnvironmentalBand } from "./environmentalBand.ts"

// The RESOLVED, LIVE environmental state -- distinct from
// SeasonEnvironmentalEnvelope (season.ts), which is the season's
// authored TARGET/baseline. Weather/Hydrology/Ecology are kept as
// separate objects, not one flat bag, so the causal chain
// (Sprint 7 Phase 2: season -> weather -> hydrology -> ecology) stays
// visible in the type shape itself, not just in code comments.

export interface WeatherState {
  temperatureBand: EnvironmentalBand
  precipitationBand: EnvironmentalBand
  humidityBand: EnvironmentalBand
}

export interface HydrologyState {
  /** The live, resolved river/water-body level -- may lag or differ from
   * the current season's hydrologyBaselineBand; that gap is exactly what
   * makes hydrology a real causal consequence of weather history, not a
   * restatement of the season envelope. */
  hydrologyBand: EnvironmentalBand
  soilMoistureBand: EnvironmentalBand
}

export interface EcologyState {
  vegetationActivityBand: EnvironmentalBand
  animalActivityBand: EnvironmentalBand
}

export interface EnvironmentalState {
  weather: WeatherState
  hydrology: HydrologyState
  ecology: EcologyState
}
