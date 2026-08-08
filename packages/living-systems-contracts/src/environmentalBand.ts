// Deliberately coarse, world-neutral band -- never a precise scientific
// unit (no degrees, no millimeters). Mirrors
// studiok-specifications/living-world/living-systems.schema.json's own
// `environmentalBand` definition field-for-field. A Living World's
// causal environment does not need, and must never fake, scientific
// precision it doesn't have.
export type EnvironmentalBand = "low" | "moderate" | "high"

export const ENVIRONMENTAL_BANDS: readonly EnvironmentalBand[] = ["low", "moderate", "high"]

export function bandIndex(band: EnvironmentalBand): number {
  return ENVIRONMENTAL_BANDS.indexOf(band)
}

export function bandAtLeast(actual: EnvironmentalBand, threshold: EnvironmentalBand): boolean {
  return bandIndex(actual) >= bandIndex(threshold)
}
