import type { EntityId } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 10, Phase 6: deterministic behavior selection, not generative
// agents -- a closed vocabulary of systemic-life behaviors, no dialogue,
// no LLM reasoning, no personality simulation.
export type BehaviorType = "REST" | "GRAZE" | "DRINK" | "MOVE_TO_RESOURCE" | "FOLLOW_GROUP" | "SOCIALIZE" | "RETURN_TO_GROUP" | "REMAIN"

export interface BehaviorIntent {
  entityId: EntityId
  type: BehaviorType
  targetLocationId: LocationId | null
  tick: number
}
