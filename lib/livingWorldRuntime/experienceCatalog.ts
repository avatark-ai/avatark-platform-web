import type { ExperienceDescription, LocationExperience } from "@avatark/renderer-contracts"
import { LIVING_VRINDAVAN_EXPERIENCE } from "./experienceDefinition.ts"

// Sprint 6, Phase 6: keyed lookup from world id to its renderer-neutral
// Experience Description, mirroring singleton.ts's own world-definition
// registry. Living Forest/Stillness/Symphony/Forge stay on the generic
// SAMPLE_WORLD_DEFINITIONS fixture with no entry here -- an honest
// "no experience description authored yet" absence, never a fabricated
// one. Adding a real experience for one of those worlds later is exactly
// one new entry here plus a vendored artifact, the same shape as adding
// Living Vrindavan was.
const EXPERIENCE_DESCRIPTIONS: Record<string, ExperienceDescription> = {
  [LIVING_VRINDAVAN_EXPERIENCE.world]: LIVING_VRINDAVAN_EXPERIENCE,
}

// Read-only lookup over a static, already-validated artifact -- this
// never touches runtime state and is never a source of truth for it (see
// docs/LIVING_VRINDAVAN_ARCHITECTURE_BOUNDARY.md's "renderer does not own
// persistence"). `currentLocationId` comes from the caller's own
// WorldState; this function only decorates it.
export function findCurrentLocationExperience(worldId: string, currentLocationId: string | null): LocationExperience | null {
  if (!currentLocationId) return null
  const description = EXPERIENCE_DESCRIPTIONS[worldId]
  if (!description) return null
  return description.locations.find((loc) => loc.id === currentLocationId) ?? null
}
