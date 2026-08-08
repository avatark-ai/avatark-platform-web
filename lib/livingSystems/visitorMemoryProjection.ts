import type { VisitorWorldMemory } from "@avatark/living-systems-contracts"
import type { ReflectionRef } from "@avatark/runtime-contracts"
import type { WorldDefinition, WorldState } from "@avatark/living-world-runtime"
import type { ExperienceEvent } from "@avatark/experience-registry"

// Sprint 7, Phase 0/9: "do not invent duplicates." Visitor meaningful
// memory is NOT a new persisted store -- it is a pure PROJECTION over the
// state Sprint 5/6 already persist reliably: @avatark/living-world-
// runtime's own per-user WorldState (`currentLocationId`) and
// @avatark/experience-registry's append-only event log
// (`reflection.created`). This function reads both, writes neither. The
// in-memory VisitorWorldMemoryRepository living-systems-runtime ships is
// a legitimate reference implementation for a future world with no
// existing WorldState/Registry equivalent -- it is deliberately NOT used
// here, since duplicating persistence Sprint 5/6 already got right would
// itself violate "do not invent duplicates."
//
// Experience Registry events don't carry a `worldId` field on
// location-scoped types (`target: {type: "location", id}` only) --
// scoping to THIS world is done by intersecting with the world's own
// authored location ids, not by a field that doesn't exist. Correct,
// if slightly more work than a direct field lookup would be.
//
// `meaningfulEncounters` stays honestly empty: no event type in this
// codebase yet records "a visitor engaged with a resolved
// AvailableEncounter" (as opposed to reflection, which already has its
// own event type) -- fabricating that mapping from a generic location
// visit would overstate what actually happened, the same restraint this
// codebase already applies to `upcomingPracticeCount`/`reflectionCount`.
export function projectVisitorWorldMemory(
  userId: string,
  definition: WorldDefinition,
  worldState: WorldState | null,
  events: ExperienceEvent[],
  currentTick: number,
): VisitorWorldMemory {
  const worldLocationIds = new Set(definition.locations.map((l) => l.id))
  const belongsToThisWorld = (event: ExperienceEvent) => event.target?.type === "location" && worldLocationIds.has(event.target.id)

  const reflectionRefs: ReflectionRef[] = events
    .filter((event) => event.type === "reflection.created" && belongsToThisWorld(event))
    .map((event) => ({ kind: "reflection", id: String(event.metadata.reflectionId ?? event.target!.id), source: "experience-registry" }))

  return {
    userId,
    worldId: definition.id,
    lastLocationId: worldState?.currentLocationId ?? null,
    meaningfulEncounters: [],
    reflectionRefs,
    milestoneRefs: [],
    updatedAtTick: currentTick,
  }
}
