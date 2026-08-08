// Sprint 7, Phase 14: the web reference renderer for the causal World
// Snapshot -- diagnostic/reference only, per the mission brief's own
// framing ("do not create photorealistic imagery, do not fake Unreal").
// Everything renderer-specific (color, labels) lives here and only
// here, mirroring lib/renderer/webExperienceRenderer.ts's own role for
// Sprint 6's experience layer. Neither @avatark/living-systems-contracts
// nor @avatark/living-systems-runtime imports this file or knows a "web"
// renderer exists.
export interface WebSeasonPresentation {
  seasonLabel: string
  accentColor: string
}

// A restrained two-color reference palette, one per authorized season --
// intentionally not a gradient/continuum, since only these two seasons
// are authorized this sprint (STK-CAN-006). An unrecognized season id
// falls back to the same neutral default lib/renderer/webExperienceRenderer.ts
// already uses, rather than erroring.
const SEASON_ACCENTS: Record<string, string> = {
  vasanta: "oklch(78% 0.13 145)", // fresh green -- flowering-forward
  grishma: "oklch(68% 0.15 45)", // warm amber -- warmer, drier
}
const DEFAULT_SEASON_ACCENT = "oklch(75% 0.05 85)"

export function presentSeason(seasonId: string, seasonName: string): WebSeasonPresentation {
  return { seasonLabel: seasonName, accentColor: SEASON_ACCENTS[seasonId] ?? DEFAULT_SEASON_ACCENT }
}

function labelizeBand(band: string): string {
  return band.charAt(0).toUpperCase() + band.slice(1)
}

// A single restrained diagnostic line -- never a dashboard of gauges.
// Structural (plain-string) parameter shapes on purpose, not the
// contract-level EnvironmentalBand-typed WeatherState/HydrologyState/
// EcologyState: this data has already crossed an HTTP/JSON boundary by
// the time a web renderer sees it, so it's a plain string at this layer
// regardless -- narrowing it back to the branded contract type here
// would be a false precision this Host-facing function doesn't need.
export function summarizeEnvironment(
  weather: { temperatureBand: string; precipitationBand: string; humidityBand: string },
  hydrology: { hydrologyBand: string; soilMoistureBand: string },
  ecology: { vegetationActivityBand: string; animalActivityBand: string },
): string {
  return [
    `Temperature ${labelizeBand(weather.temperatureBand)}`,
    `Rainfall ${labelizeBand(weather.precipitationBand)}`,
    `River ${labelizeBand(hydrology.hydrologyBand)}`,
    `Vegetation ${labelizeBand(ecology.vegetationActivityBand)}`,
    `Animal presence ${labelizeBand(ecology.animalActivityBand)}`,
  ].join(" · ")
}

export function labelizeLifecyclePhase(phase: string): string {
  return phase.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}
