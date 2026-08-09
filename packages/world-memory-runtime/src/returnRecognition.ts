import type { WorldId } from "@avatark/runtime-contracts"
import type { ReturnRecognition, ReturnRecognitionFact, ReturnRecognitionFactType, WorldEvent, WorldEventCategory } from "@avatark/world-memory-contracts"

// Sprint 11, Phase 11: a fixed, reviewable mapping from WorldEvent
// category to semantic fact type -- never prose, never "While you were
// away...". A category with no mapping (there is none currently)
// contributes no fact at all.
const CATEGORY_TO_FACT: Record<WorldEventCategory, ReturnRecognitionFactType> = {
  SEASON_TRANSITION: "season_changed",
  ENVIRONMENTAL_THRESHOLD: "environment_changed",
  RESOURCE_CONDITION_CHANGED: "environment_changed",
  LOCATION_CONDITION_CHANGED: "environment_changed",
  POPULATION_MOVEMENT: "population_relocated",
  GROUP_FORMED: "population_relocated",
  GROUP_DISPERSED: "population_relocated",
  ENTITY_ACTIVITY_TRANSITION: "known_entity_state_changed",
  ENCOUNTER_BECAME_AVAILABLE: "encounter_changed",
  ENCOUNTER_RESOLVED: "encounter_changed",
}

// Sprint 11, Phase 11: derived entirely from World Memory events since
// the visitor's own last-known tick -- current authoritative state is
// used only to bound `currentTick`, never queried for anything else
// here (the facts are about what CHANGED, which World Memory already
// captured).
export function computeReturnRecognition(worldId: WorldId, userId: string, sinceTick: number, currentTick: number, eventsSince: WorldEvent[]): ReturnRecognition {
  const grouped = new Map<ReturnRecognitionFactType, { categories: Set<WorldEventCategory>; count: number }>()

  for (const event of eventsSince) {
    const factType = CATEGORY_TO_FACT[event.category]
    const existing = grouped.get(factType) ?? { categories: new Set<WorldEventCategory>(), count: 0 }
    existing.categories.add(event.category)
    existing.count += 1
    grouped.set(factType, existing)
  }

  const facts: ReturnRecognitionFact[] = [...grouped.entries()].map(([type, { categories, count }]) => ({
    type,
    sourceCategories: [...categories],
    occurrenceCount: count,
  }))

  return { worldId, userId, sinceTick, currentTick, facts }
}
