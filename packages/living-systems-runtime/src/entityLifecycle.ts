import type { EcologyState, EntityArchetype, LivingEntityState } from "@avatark/living-systems-contracts"

// Sprint 7, Phase 8: persistent entity advancement. Deliberately not a
// full ECS -- one generic rule, not a per-archetype-id special case
// (that would smuggle Vrindavan-specific branching into this
// franchise-neutral package). In this minimal reference model, every
// archetype's lifecycle responds to the location's own resolved
// `ecology.vegetationActivityBand` as a general proxy for ecological
// favorability: high favorability advances an entity one step forward
// through its own authored `lifecyclePhases[]`, low favorability regresses
// it one step, moderate holds. `variationValue` (Sprint 7 Phase 7's
// deterministic variation, not Math.random()) paces forward advancement
// so an entity doesn't jump every single tick.
//
// A richer model driving different archetypes off different bands is a
// natural future extension (e.g. a per-archetype `drivingBand` field on
// EntityArchetype) -- not added now, since STK-SPEC-005 doesn't yet
// author one and nothing this sprint requires it.
export function advanceEntityLifecycle(entity: LivingEntityState, archetype: EntityArchetype, ecology: EcologyState, variationValue: number, tick: number): LivingEntityState {
  const currentIndex = archetype.lifecyclePhases.indexOf(entity.lifecyclePhase)
  if (currentIndex === -1) throw new Error(`entity "${entity.id}": lifecyclePhase "${entity.lifecyclePhase}" is not one of archetype "${archetype.id}"'s lifecyclePhases`)

  let nextIndex = currentIndex
  if (ecology.vegetationActivityBand === "high" && variationValue > 0.5) {
    nextIndex = Math.min(currentIndex + 1, archetype.lifecyclePhases.length - 1)
  } else if (ecology.vegetationActivityBand === "low") {
    nextIndex = Math.max(currentIndex - 1, 0)
  }

  if (nextIndex === currentIndex) return entity
  return { ...entity, lifecyclePhase: archetype.lifecyclePhases[nextIndex], lastUpdatedTick: tick }
}
