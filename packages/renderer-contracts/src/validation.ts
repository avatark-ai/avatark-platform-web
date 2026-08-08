import type { ExperienceDescription, LocationExperience } from "./experienceDescription.ts"

// Structural validation only -- mirrors studiok-specifications'
// scripts/validate-experience-artifact.mjs field-for-field, so a
// consumer never trusts a vendored artifact without re-checking it
// (same reasoning as lib/livingWorldRuntime/vrindavanDefinition.ts's own
// `validate()`). Cross-artifact checks against a companion
// WorldDefinition are a Host concern (they need @avatark/living-world-
// runtime's WorldDefinition shape), not this package's -- this package
// stays franchise- and runtime-agnostic.

const TIME_STATES = new Set(["unspecified", "dawn", "midday", "twilight", "night"])
const AFFORDANCES = new Set(["threshold-crossing", "gradual-emergence", "branching-choice"])
const INTENSITIES = new Set(["restrained", "standard"])
const PACINGS = new Set(["slow", "moderate"])

export interface ExperienceValidationError {
  message: string
}

export function validateExperienceDescription(doc: unknown): ExperienceValidationError[] {
  const errors: ExperienceValidationError[] = []
  const push = (message: string) => errors.push({ message })

  if (typeof doc !== "object" || doc === null) {
    push("experience description must be an object")
    return errors
  }
  const candidate = doc as Partial<ExperienceDescription>

  if (candidate.schemaVersion !== "1.0.0") {
    push(`schemaVersion must be "1.0.0", got "${String(candidate.schemaVersion)}"`)
  }
  if (typeof candidate.world !== "string" || candidate.world.length === 0) {
    push("world must be a non-empty string")
  }
  if (!Array.isArray(candidate.locations) || candidate.locations.length === 0) {
    push("locations must be a non-empty array")
    return errors
  }

  const seenIds = new Set<string>()
  for (const loc of candidate.locations as Partial<LocationExperience>[]) {
    if (typeof loc.id !== "string" || loc.id.length === 0) {
      push(`location entry has an invalid or missing id: ${JSON.stringify(loc)}`)
      continue
    }
    if (seenIds.has(loc.id)) push(`duplicate location id "${loc.id}"`)
    seenIds.add(loc.id)

    if (typeof loc.environment?.biome !== "string" || loc.environment.biome.length === 0) {
      push(`location "${loc.id}": environment.biome must be a non-empty string`)
    }
    if (typeof loc.atmosphere?.quality !== "string" || loc.atmosphere.quality.length === 0) {
      push(`location "${loc.id}": atmosphere.quality must be a non-empty string`)
    }
    if (!loc.time || !TIME_STATES.has(loc.time.preferredState as string)) {
      push(`location "${loc.id}": time.preferredState "${loc.time?.preferredState}" is invalid`)
    }
    if (!Array.isArray(loc.soundscape?.motifs)) {
      push(`location "${loc.id}": soundscape.motifs must be an array`)
    }
    if (typeof loc.interaction?.reflectionAvailable !== "boolean") {
      push(`location "${loc.id}": interaction.reflectionAvailable must be a boolean`)
    }
    if (!loc.presentation || !INTENSITIES.has(loc.presentation.intensity as string)) {
      push(`location "${loc.id}": presentation.intensity "${loc.presentation?.intensity}" is invalid`)
    }
    if (!loc.presentation || !PACINGS.has(loc.presentation.pacing as string)) {
      push(`location "${loc.id}": presentation.pacing "${loc.presentation?.pacing}" is invalid`)
    }
  }

  if (!Array.isArray(candidate.transitions)) {
    push("transitions must be an array")
  } else {
    for (const t of candidate.transitions) {
      if (!seenIds.has(t.from)) push(`transition references unknown location "${t.from}" (from)`)
      if (!seenIds.has(t.to)) push(`transition references unknown location "${t.to}" (to)`)
      if (!AFFORDANCES.has(t.affordance)) push(`transition ${t.from}->${t.to}: affordance "${t.affordance}" is invalid`)
    }
  }

  if (!candidate.provenance || typeof candidate.provenance.specId !== "string") {
    push("provenance.specId is required")
  }

  return errors
}

export function isValidExperienceDescription(doc: unknown): doc is ExperienceDescription {
  return validateExperienceDescription(doc).length === 0
}
