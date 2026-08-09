import type { EntityArchetypeId, EntityId } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 8, Phase 6: entity identity / authoritative state / presentation
// state stay three separate concerns. `id` is carried through unchanged
// from LivingEntityState -- stable across snapshots, never regenerated
// by this layer, so a renderer can track "the same entity" across ticks.
// `animationSemantic`/`audioSemantic` are intent ("resting"), never an
// engine asset path ("/Game/Anim/..."). The renderer decides HOW.
//
// Sprint 10, Phase 15: three additive fields for entities that have
// semantic movement/group state (the living-population domain) --
// `movementSemantic`/`movementTargetLocationId`/`groupId` are all
// `null` for any entity that doesn't carry that state (every Sprint 7/8
// vegetation-roster entity, unchanged), never a required concept this
// type forces on every producer.
export interface EntityPresentation {
  entityId: EntityId
  archetypeId: EntityArchetypeId
  locationId: LocationId
  visible: boolean
  presentationArchetype: string
  activityHint: string
  animationSemantic: string
  audioSemantic: string | null
  movementSemantic: string | null
  movementTargetLocationId: LocationId | null
  groupId: string | null
}
