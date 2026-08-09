import type { WorldEventCategory } from "./worldEvent.ts"
import type { WorldId } from "@avatark/runtime-contracts"

// Sprint 11, Phase 11: a renderer-neutral, semantic-fact-only answer to
// "what meaningfully changed in this world since this visitor last
// experienced it" -- never prose, never "While you were away...". The
// experience/renderer layer decides how (or whether) to present these
// facts; this package only states them.
// Sprint 12, Phase 12: one additive fact type -- `social_relationship_changed`
// -- for separation/reunion history. Every existing fact type is
// unchanged.
// Sprint 18, Phase 12: one additive fact type -- `canonical_event_occurred`
// -- for authorized StudioK canonical events. None of the prior fact
// types semantically fit "an authored event happened" (it is not an
// environment/population/encounter/entity/relationship change on its
// own terms); every existing fact type remains unchanged.
export type ReturnRecognitionFactType = "season_changed" | "environment_changed" | "population_relocated" | "encounter_changed" | "known_entity_state_changed" | "social_relationship_changed" | "canonical_event_occurred"

export interface ReturnRecognitionFact {
  type: ReturnRecognitionFactType
  /** Which WorldEvent categories contributed to this fact -- structured
   * provenance, same discipline as WorldEvent's own causalReferences. */
  sourceCategories: WorldEventCategory[]
  occurrenceCount: number
}

export interface ReturnRecognition {
  worldId: WorldId
  userId: string
  sinceTick: number
  currentTick: number
  facts: ReturnRecognitionFact[]
}

// An honest "nothing meaningfully changed" result -- e.g. a visitor
// returning at the exact tick they left, or before anything significant
// occurred. Mirrors @avatark/living-systems-contracts's own
// emptyVisitorWorldMemory/emptyProtectedNarrativeProjection convention.
export function emptyReturnRecognition(worldId: WorldId, userId: string, sinceTick: number, currentTick: number): ReturnRecognition {
  return { worldId, userId, sinceTick, currentTick, facts: [] }
}
