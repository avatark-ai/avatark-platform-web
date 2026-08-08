import type { EntityArchetypeId, EntityId } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 8, Phase 6: entity identity / authoritative state / presentation
// state stay three separate concerns. `id` is carried through unchanged
// from LivingEntityState -- stable across snapshots, never regenerated
// by this layer, so a renderer can track "the same entity" across ticks.
// `animationSemantic`/`audioSemantic` are intent ("resting"), never an
// engine asset path ("/Game/Anim/..."). The renderer decides HOW.
export interface EntityPresentation {
  entityId: EntityId
  archetypeId: EntityArchetypeId
  locationId: LocationId
  visible: boolean
  presentationArchetype: string
  activityHint: string
  animationSemantic: string
  audioSemantic: string | null
}
