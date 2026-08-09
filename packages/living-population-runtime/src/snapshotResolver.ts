import type { LivingEntityState } from "@avatark/living-systems-contracts"
import type { EncounterOpportunity, EntityBehaviorState, GroupState, PopulationSnapshot } from "@avatark/living-population-contracts"

// The population-domain analogue of @avatark/living-systems-runtime's
// own resolveWorldSnapshot -- a pure, read-only assembly of a
// PopulationSnapshot from whatever the durable/in-memory stores
// currently hold. Never itself a store, never itself an advance.
export function resolvePopulationSnapshot(worldId: string, tick: number, populationEntities: LivingEntityState[], behaviorStates: EntityBehaviorState[], groups: GroupState[], encounterOpportunities: EncounterOpportunity[]): PopulationSnapshot {
  const behaviorByEntityId = new Map(behaviorStates.map((s) => [s.entityId, s]))

  return {
    worldId,
    tick,
    entities: populationEntities.map((entity) => {
      const behavior = behaviorByEntityId.get(entity.id)
      return {
        entityId: entity.id,
        archetypeId: entity.archetypeId,
        locationId: entity.locationId,
        activity: behavior?.activity ?? "REMAIN",
        movement: behavior?.movementType ?? "Remain",
        movementTargetLocationId: behavior?.movementTargetLocationId ?? null,
        groupId: behavior?.groupId ?? null,
        needs: behavior?.needs ?? [],
      }
    }),
    groups,
    encounterOpportunities,
  }
}
