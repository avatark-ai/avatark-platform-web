import { bandIndex, ENVIRONMENTAL_BANDS } from "@avatark/living-systems-contracts"
import type { EcologyState, HydrologyState, SeasonEnvironmentalEnvelope, WeatherState } from "@avatark/living-systems-contracts"

// Sprint 7, Phase 2: the causal environment pipeline, as explicit,
// separately-exported, staged functions -- not one opaque
// "simulate()" blob. This is deliberately NOT a scientific simulator (no
// real units, only the coarse low/moderate/high band); it IS a real
// causal graph: each function's output depends only on the specific
// upstream inputs the chain in the Sprint 7 brief names, nothing else.
//
//   season envelope -> WEATHER -> (weather + hydrology history) -> HYDROLOGY -> (hydrology + season + weather) -> ECOLOGY
//
// A future world can substitute a different deriveWeather/deriveHydrology/
// deriveEcology (different formulas, even different upstream inputs)
// without this pipeline's shape changing -- that substitutability is the
// point, not the specific arithmetic below.

function clampIndex(index: number): number {
  return Math.max(0, Math.min(ENVIRONMENTAL_BANDS.length - 1, index))
}

// Weather is the direct expression of the current season's own authored
// envelope -- the season IS the weather's cause, with no further
// derivation needed at this stage.
export function deriveWeather(envelope: SeasonEnvironmentalEnvelope): WeatherState {
  return {
    temperatureBand: envelope.temperatureBand,
    precipitationBand: envelope.precipitationBand,
    humidityBand: envelope.humidityBand,
  }
}

// Hydrology trends toward the season's baseline by one band-step per
// call (so it reflects HISTORY -- `previousHydrology` -- not just an
// instantaneous snapshot of the season), then weather's own precipitation
// nudges it further. This is the "Weather + hydrology history influence
// river level / soil moisture" link from Sprint 7's own causal chain.
export function deriveHydrology(weather: WeatherState, previousHydrology: HydrologyState, envelope: SeasonEnvironmentalEnvelope): HydrologyState {
  const targetIndex = bandIndex(envelope.hydrologyBaselineBand)
  let index = bandIndex(previousHydrology.hydrologyBand)
  if (index < targetIndex) index += 1
  else if (index > targetIndex) index -= 1

  if (weather.precipitationBand === "high") index += 1
  else if (weather.precipitationBand === "low") index -= 1

  const hydrologyBand = ENVIRONMENTAL_BANDS[clampIndex(index)]
  // Soil moisture is modeled as directly tracking hydrology in this
  // minimal reference implementation -- a documented simplification, not
  // an oversight (a richer model could give it its own lag/decay).
  return { hydrologyBand, soilMoistureBand: hydrologyBand }
}

// Vegetation activity trends toward the season's own target but is
// capped by hydrology -- dry ground can't sustain a season's full
// flowering potential even in a flowering-forward season. Animal
// activity trends toward the season's target but drops when temperature
// is high. This is the "Hydrology + season + temperature influence
// vegetation/flowering" and "Ecology + time + weather influence animal
// presence" links from Sprint 7's own causal chain.
export function deriveEcology(hydrology: HydrologyState, envelope: SeasonEnvironmentalEnvelope, weather: WeatherState): EcologyState {
  const seasonVegetationIndex = bandIndex(envelope.vegetationActivityBand)
  const hydrologyIndex = bandIndex(hydrology.hydrologyBand)
  const vegetationActivityBand = ENVIRONMENTAL_BANDS[Math.min(seasonVegetationIndex, hydrologyIndex + 1)]

  const seasonAnimalIndex = bandIndex(envelope.animalActivityBand)
  const animalActivityBand = ENVIRONMENTAL_BANDS[weather.temperatureBand === "high" ? Math.max(0, seasonAnimalIndex - 1) : seasonAnimalIndex]

  return { vegetationActivityBand, animalActivityBand }
}
