import type { EnvironmentalBand } from "@avatark/living-systems-contracts"
import type { SensoryCue } from "./sensoryCue.ts"

// Sprint 8, Phase 7: semantic presentation parameters derived from causal
// world state -- never engine-specific material/shader/Niagara/PCG/
// lighting configuration. `*Band` fields are carried through unchanged
// from Living Systems' own EnvironmentalState (Sprint 7) so provenance
// stays traceable; `semantic` fields are the presentation-layer
// vocabulary this sprint introduces, derived from an ExperienceDescription's
// own authored intent (biome/atmosphere.quality) plus the current band.
export interface AtmospherePresentation {
  semantic: string
  temperatureBand: EnvironmentalBand
  illuminationSemantic: string
}

export interface WaterPresentation {
  semantic: string
  levelBand: EnvironmentalBand
}

export interface VegetationPresentation {
  semantic: string
  densityBand: EnvironmentalBand
}

export interface EnvironmentPresentation {
  atmosphere: AtmospherePresentation
  water: WaterPresentation
  vegetation: VegetationPresentation
  sensoryCues: SensoryCue[]
}
