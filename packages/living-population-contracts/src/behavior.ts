import type { EntityId } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 10, Phase 6: deterministic behavior selection, not generative
// agents -- a closed vocabulary of systemic-life behaviors, no dialogue,
// no LLM reasoning, no personality simulation.
//
// Sprint 12, Phase 9: two additive variants for social behavior --
// `APPROACH_RELATED_ENTITY` (move toward where a related entity
// currently is) and `RETURN_TO_HOME_RANGE` (move toward a preferred
// location when away from it). Every existing variant is unchanged;
// no existing caller's behavior differs unless it explicitly opts into
// the new `socialContext` param (see behaviorSelection.ts).
export type BehaviorType = "REST" | "GRAZE" | "DRINK" | "MOVE_TO_RESOURCE" | "FOLLOW_GROUP" | "SOCIALIZE" | "RETURN_TO_GROUP" | "REMAIN" | "APPROACH_RELATED_ENTITY" | "RETURN_TO_HOME_RANGE"

export interface BehaviorIntent {
  entityId: EntityId
  type: BehaviorType
  targetLocationId: LocationId | null
  tick: number
}
