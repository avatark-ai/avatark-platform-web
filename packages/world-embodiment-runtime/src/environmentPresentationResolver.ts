import type { EnvironmentalBand, EnvironmentalState } from "@avatark/living-systems-contracts"
import type { LocationExperience } from "@avatark/renderer-contracts"
import type { EnvironmentPresentation } from "@avatark/world-embodiment-contracts"

// Sprint 8, Phase 7: combines Sprint 6's STATIC authored intent
// (LocationExperience -- biome/atmosphere/soundscape, unchanged by
// season) with Sprint 7's DYNAMIC causal state (EnvironmentalState --
// weather/hydrology/ecology, changes across the Vasanta/Grishma
// transition) into one presentation. Band-driven, never
// location-id-driven -- the same two functions below produce a
// genuinely different result for the same location once its causal
// state changes, which is exactly Phase 5's "same location embodies
// differently" requirement, and produce a sensible result for a wholly
// different world's location too (proven by this package's alternate-
// world-fixture test).
function deriveWaterSemantic(band: EnvironmentalBand): string {
  return band === "high" ? "rushing" : band === "moderate" ? "flowing" : "still"
}

function deriveVegetationSemantic(biome: string, band: EnvironmentalBand): string {
  const intensity = band === "high" ? "dense" : band === "moderate" ? "moderate" : "sparse"
  return `${intensity}-${biome}`
}

export function resolveEnvironmentPresentation(experience: LocationExperience, environment: EnvironmentalState, soundEnabled: boolean): EnvironmentPresentation {
  return {
    atmosphere: {
      semantic: experience.atmosphere.quality,
      temperatureBand: environment.weather.temperatureBand,
      illuminationSemantic: experience.time.preferredState,
    },
    water: {
      semantic: deriveWaterSemantic(environment.hydrology.hydrologyBand),
      levelBand: environment.hydrology.hydrologyBand,
    },
    vegetation: {
      semantic: deriveVegetationSemantic(experience.environment.biome, environment.ecology.vegetationActivityBand),
      densityBand: environment.ecology.vegetationActivityBand,
    },
    sensoryCues: soundEnabled ? experience.soundscape.motifs.map((motif) => ({ channel: "ambientAudio" as const, semantic: motif })) : [],
  }
}
