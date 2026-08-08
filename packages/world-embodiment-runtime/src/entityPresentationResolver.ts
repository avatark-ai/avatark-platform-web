import type { EntityArchetype, LivingEntityState } from "@avatark/living-systems-contracts"
import type { EntityPresentation } from "@avatark/world-embodiment-contracts"

// Sprint 8, Phase 6: identity (entityId, carried through unchanged --
// stable across snapshots) / authoritative state (lifecyclePhase, from
// Living Systems) / presentation state (this function's own output)
// stay three separate concerns. `visible: true` unconditionally in this
// minimal reference resolver: a richer model distinguishing "present"
// from "away" lifecycle phases per archetype (e.g. a future
// `awayPhases` field on EntityArchetype) is a natural extension, not
// something STK-SPEC-005 authorizes yet -- inventing that distinction
// now would be exactly the schema-widening this sprint's governance
// section asks not to do without going through StudioK.
export function resolveEntityPresentation(entity: LivingEntityState, archetype: EntityArchetype): EntityPresentation {
  return {
    entityId: entity.id,
    archetypeId: entity.archetypeId,
    locationId: entity.locationId,
    visible: true,
    presentationArchetype: archetype.name,
    activityHint: entity.lifecyclePhase,
    animationSemantic: entity.lifecyclePhase,
    audioSemantic: null,
  }
}
