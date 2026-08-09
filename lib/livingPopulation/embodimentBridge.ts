import type { GroupIntentInput } from "@avatark/world-embodiment-runtime"
import type { EntityPresentation } from "@avatark/world-embodiment-contracts"
import type { EntityBehaviorState, GroupState } from "@avatark/living-population-contracts"
import type { LivingEntityState } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 10, Phase 15/17: the ONE place population state is translated
// into the renderer-neutral EntityPresentation/GroupIntentInput shapes
// @avatark/world-embodiment-runtime already accepts as plain data --
// Host logic, so neither @avatark/living-population-runtime nor
// @avatark/world-embodiment-runtime needs to depend on the other.
export function buildPopulationEntityPresentationsByLocation(entities: LivingEntityState[], behaviorStatesByEntityId: ReadonlyMap<string, EntityBehaviorState>, archetypeNamesById: Record<string, string>): Record<LocationId, EntityPresentation[]> {
  const byLocation: Record<LocationId, EntityPresentation[]> = {}
  for (const entity of entities) {
    const behavior = behaviorStatesByEntityId.get(entity.id)
    const presentation: EntityPresentation = {
      entityId: entity.id,
      archetypeId: entity.archetypeId,
      locationId: entity.locationId,
      visible: true,
      presentationArchetype: archetypeNamesById[entity.archetypeId] ?? entity.archetypeId,
      activityHint: entity.lifecyclePhase,
      animationSemantic: behavior?.activity ?? entity.lifecyclePhase,
      audioSemantic: null,
      movementSemantic: behavior?.movementType ?? null,
      movementTargetLocationId: behavior?.movementTargetLocationId ?? null,
      groupId: behavior?.groupId ?? null,
    }
    if (!byLocation[entity.locationId]) byLocation[entity.locationId] = []
    byLocation[entity.locationId].push(presentation)
  }
  return byLocation
}

export function buildGroupIntentInputs(groups: GroupState[]): GroupIntentInput[] {
  return groups.map((group) => ({ groupId: group.id, locationId: group.locationId, targetLocationId: group.targetLocationId, cohesion: group.cohesion }))
}
