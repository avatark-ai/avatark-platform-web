import type { EntityId } from "@avatark/living-systems-contracts"
import type { BehaviorType, GroupId } from "@avatark/living-population-contracts"
import type { LocationId } from "@avatark/runtime-contracts"
import type { OccupancyLevel, PlaceOccupancy } from "@avatark/living-rhythms-contracts"

export interface PlaceOccupancyEntityInput {
  entityId: EntityId
  archetypeId: string
  activity: BehaviorType
  groupId: GroupId | null
}

const MOVEMENT_TYPES = new Set<BehaviorType>(["MOVE_TO_RESOURCE", "FOLLOW_GROUP", "RETURN_TO_GROUP", "APPROACH_RELATED_ENTITY", "RETURN_TO_HOME_RANGE"])

function resolveOccupancyLevel(activityMix: Partial<Record<BehaviorType, number>>, presentCount: number): OccupancyLevel {
  if (presentCount === 0) return "QUIET"

  const restFraction = (activityMix.REST ?? 0) / presentCount
  const socializeFraction = (activityMix.SOCIALIZE ?? 0) / presentCount
  const movementCount = [...MOVEMENT_TYPES].reduce((sum, type) => sum + (activityMix[type] ?? 0), 0)
  const movementFraction = movementCount / presentCount

  if (restFraction > 0.5) return "RESTING"
  if (socializeFraction > 0.5) return "GATHERING"
  if (movementFraction > 0.5) return "DISPERSING"
  return "ACTIVE"
}

// Sprint 13, Phase 9: reconstructed FRESH from authoritative
// population/group state every call -- no repository, no `save`, the
// same posture Sprint 10's own `PopulationSnapshot` already
// established (see docs/SPRINT13_GROUND_TRUTH.md's decision 3).
// `entities` must already be filtered to this location by the caller
// (the same convention `computeEncounterOpportunities` already uses).
export function resolvePlaceOccupancy(locationId: LocationId, entities: PlaceOccupancyEntityInput[], tick: number): PlaceOccupancy {
  const presentEntityIds = entities.map((e) => e.entityId)
  const presentGroupIds = [...new Set(entities.map((e) => e.groupId).filter((id): id is GroupId => id !== null))]

  const entityCountsByArchetype: Record<string, number> = {}
  const activityMix: Partial<Record<BehaviorType, number>> = {}
  for (const entity of entities) {
    entityCountsByArchetype[entity.archetypeId] = (entityCountsByArchetype[entity.archetypeId] ?? 0) + 1
    activityMix[entity.activity] = (activityMix[entity.activity] ?? 0) + 1
  }

  return { locationId, tick, presentEntityIds, presentGroupIds, entityCountsByArchetype, activityMix, occupancyLevel: resolveOccupancyLevel(activityMix, entities.length) }
}
