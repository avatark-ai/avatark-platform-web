import type { CausalReference } from "@avatark/world-memory-contracts"
import type { WorldId } from "@avatark/runtime-contracts"
import type { AdaptationRuleId, AdaptationEffectId } from "./ids.ts"

// Sprint 15, mission's own "WHAT MAY ADAPT" section, restated as a
// CLOSED, typed union per domain -- deliberately NOT a universal
// mutable property bag (the mission's own explicit prohibition). Each
// variant names exactly which existing subject it is about
// (EntityId/RelationshipId/LocationId/GroupId/EncounterRuleId, every one
// an id an existing Sprint 7-14 contract already defines) and a small,
// closed `kind` vocabulary -- never a free-form string.
//
// Only a subset of these kinds is exercised by the Vrindavan reference
// rules this sprint authors (see lib/worldAdaptation/vrindavanAdaptationDefinition.ts)
// -- the remainder is reserved, modeled vocabulary, the same "prove the
// mechanism, not exhaust the design space" posture Sprint 13/14's own
// technical debt already used for e.g. REMEMBERED/SUPERSEDED.
export type EntityAdaptationEffectKind = "ROUTINE_PREFERENCE" | "RESOURCE_PREFERENCE_BIAS" | "LOCATION_PREFERENCE" | "SOCIAL_AFFINITY" | "SOCIAL_AVOIDANCE" | "GROUP_PARTICIPATION_BIAS"

export type RelationshipAdaptationEffectKind = "AFFINITY_BIAS" | "INTERACTION_LIKELIHOOD_BIAS"

export type PlaceAdaptationEffectKind = "HABITUAL_OCCUPANCY" | "USE_PRESSURE" | "RESOURCE_PRESSURE" | "SOCIAL_SIGNIFICANCE" | "ENCOUNTER_ELIGIBILITY"

export type GroupAdaptationEffectKind = "COHESION_BIAS" | "GROUP_ROUTINE_PREFERENCE" | "MOVEMENT_TENDENCY"

export type WorldPossibilityAdaptationEffectKind = "ENCOUNTER_WEIGHT_BIAS" | "RESOURCE_AVAILABILITY_CONSEQUENCE" | "ROUTINE_SELECTION_BIAS"

interface AdaptationEffectBase {
  id: AdaptationEffectId
  worldId: WorldId
  ruleId: AdaptationRuleId
  // The tier of accumulated pressure that produced this effect (see
  // @avatark/world-adaptation-runtime's own `evaluateAdaptationRule`) --
  // `id` is content-derived FROM this tier, so a later wake that
  // recomputes the SAME tier reuses the SAME id (idempotent), and a
  // wake that crosses a NEW tier produces a genuinely new, distinct
  // effect record -- this is the mission's own "bounded accumulation"
  // made concrete: one encounter is never enough to reach tier 1 alone.
  tier: number
  appliedTick: number
  // Whether this effect's real-world consequence is meant to fade if
  // the underlying pressure later decays back down (see the rule's own
  // `reversible` flag) -- a documentation field for downstream
  // consumers; this package never itself "undoes" a past effect record
  // (append-only history, the same posture WorldEvent already holds).
  reversible: boolean
  causalReferences: CausalReference[]
}

export type AdaptationEffect =
  | (AdaptationEffectBase & { domain: "ENTITY"; entityId: string; kind: EntityAdaptationEffectKind })
  | (AdaptationEffectBase & { domain: "RELATIONSHIP"; relationshipId: string; kind: RelationshipAdaptationEffectKind })
  | (AdaptationEffectBase & { domain: "PLACE"; locationId: string; kind: PlaceAdaptationEffectKind })
  | (AdaptationEffectBase & { domain: "GROUP"; groupId: string; kind: GroupAdaptationEffectKind })
  | (AdaptationEffectBase & { domain: "WORLD_POSSIBILITY"; subjectId: string; kind: WorldPossibilityAdaptationEffectKind })

export type AppendAdaptationEffectResult = { status: "appended" | "duplicate_ignored" }

export interface AdaptationEffectRepository {
  // Idempotent by id (the same discipline every WorldEvent/EncounterRecord
  // append already holds) -- appending an effect whose id was already
  // stored is a no-op.
  append(effect: AdaptationEffect): Promise<AppendAdaptationEffectResult>
  listBySubject(worldId: WorldId, domain: AdaptationEffect["domain"], subjectId: string): Promise<AdaptationEffect[]>
  listByWorld(worldId: WorldId): Promise<AdaptationEffect[]>
}
