import type { GroupId } from "@avatark/living-population-contracts"
import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 13, Phase 7: a closed vocabulary of collective daily-life
// tendencies -- a semantic label for "what this group's own members are
// mostly doing right now," never a scripted group script.
export type GroupRoutineIntentType = "REST_TOGETHER" | "MOVE_TO_RESOURCE" | "DISPERSE" | "GATHER" | "FOLLOW_ROUTE" | "OCCUPY_PLACE"

// Sprint 13, Phase 7: a Host-COMPOSED READ, resolved from the group's
// own members' current activity/rhythm state at read time -- it never
// writes back into Sprint 10's own `GroupState`/`targetLocationId`, so
// there is exactly one group-intent authority
// (`advanceGroupState`), never two (see
// docs/SPRINT13_GROUND_TRUTH.md's decision 6).
export interface GroupRoutineIntent {
  groupId: GroupId
  intent: GroupRoutineIntentType
  targetLocationId: LocationId | null
  tick: number
}
