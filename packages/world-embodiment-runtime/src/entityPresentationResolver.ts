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
export interface EntityPresentationBehaviorExtra {
  movementSemantic: string | null
  movementTargetLocationId: string | null
  groupId: string | null
}

// Sprint 10, Phase 15: `extra` is optional and defaults every new field
// to `null` -- an existing caller that never passes it (every Sprint 7/8
// vegetation-roster call site, unchanged) gets byte-identical behavior
// to before this field existed.
export function resolveEntityPresentation(entity: LivingEntityState, archetype: EntityArchetype, extra?: EntityPresentationBehaviorExtra): EntityPresentation {
  return {
    entityId: entity.id,
    archetypeId: entity.archetypeId,
    locationId: entity.locationId,
    visible: true,
    presentationArchetype: archetype.name,
    activityHint: entity.lifecyclePhase,
    animationSemantic: entity.lifecyclePhase,
    audioSemantic: null,
    movementSemantic: extra?.movementSemantic ?? null,
    movementTargetLocationId: extra?.movementTargetLocationId ?? null,
    groupId: extra?.groupId ?? null,
  }
}
