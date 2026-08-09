import type { BehaviorType, GroupState } from "@avatark/living-population-contracts"
import type { GroupRoutineIntent } from "@avatark/living-rhythms-contracts"

const MOVEMENT_TYPES = new Set<BehaviorType>(["MOVE_TO_RESOURCE", "FOLLOW_GROUP", "RETURN_TO_GROUP", "APPROACH_RELATED_ENTITY", "RETURN_TO_HOME_RANGE"])

// Sprint 13, Phase 7: a Host-COMPOSED READ over the group's own
// members' CURRENT activities -- majority-rule, deterministic, never a
// write back into `GroupState`/`advanceGroupState` (see
// docs/SPRINT13_GROUND_TRUTH.md's decision 6: exactly one group-intent
// authority). Falls back to `DISPERSE` for an empty group (nothing to
// observe) and `OCCUPY_PLACE` when no single tendency has a majority
// (the group is simply where it is, doing a mix of things).
export function resolveGroupRoutineIntent(group: GroupState, memberActivities: BehaviorType[], tick: number): GroupRoutineIntent {
  const total = memberActivities.length
  if (total === 0) return { groupId: group.id, intent: "DISPERSE", targetLocationId: null, tick }

  const restFraction = memberActivities.filter((a) => a === "REST").length / total
  const socializeFraction = memberActivities.filter((a) => a === "SOCIALIZE").length / total
  const movementFraction = memberActivities.filter((a) => MOVEMENT_TYPES.has(a)).length / total

  if (restFraction > 0.5) return { groupId: group.id, intent: "REST_TOGETHER", targetLocationId: null, tick }
  if (socializeFraction > 0.5) return { groupId: group.id, intent: "GATHER", targetLocationId: null, tick }
  if (movementFraction > 0.5) return { groupId: group.id, intent: group.targetLocationId ? "MOVE_TO_RESOURCE" : "FOLLOW_ROUTE", targetLocationId: group.targetLocationId, tick }
  if (group.cohesion < 0.5) return { groupId: group.id, intent: "DISPERSE", targetLocationId: null, tick }
  return { groupId: group.id, intent: "OCCUPY_PLACE", targetLocationId: group.locationId, tick }
}
