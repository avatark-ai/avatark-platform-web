import type { GroupState, MovementIntent } from "@avatark/living-population-contracts"
import type { LivingEntityState } from "@avatark/living-systems-contracts"

export interface AdvanceGroupStateParams {
  group: GroupState
  memberEntities: LivingEntityState[]
  memberMovementIntents: MovementIntent[]
  tick: number
}

// Sprint 10, Phase 8: minimal, semantic herd/flock dynamics -- "this
// group moves from region A toward region B," never an individual
// trajectory. `cohesion` is the observable fraction of members
// currently at the group's own locationId. The group's desired
// direction is a deterministic majority vote across members who
// individually decided to approach a resource on their own (a simple,
// legible stand-in for "leader/reference direction" -- no member is a
// privileged leader, the group simply follows where most of it already
// wants to go).
export function advanceGroupState(params: AdvanceGroupStateParams): GroupState {
  const { group, memberEntities, memberMovementIntents, tick } = params

  const atCurrent = memberEntities.filter((e) => e.locationId === group.locationId).length
  const cohesion = memberEntities.length > 0 ? atCurrent / memberEntities.length : 0

  const targetVotes = new Map<string, number>()
  for (const intent of memberMovementIntents) {
    if (intent.type === "ApproachResource" && intent.targetLocationId && intent.targetLocationId !== group.locationId) {
      targetVotes.set(intent.targetLocationId, (targetVotes.get(intent.targetLocationId) ?? 0) + 1)
    }
  }

  let targetLocationId = group.targetLocationId
  if (targetVotes.size > 0) {
    targetLocationId = [...targetVotes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0]
  }

  let locationId = group.locationId
  if (targetLocationId && targetLocationId !== group.locationId && memberEntities.length > 0) {
    const atTarget = memberEntities.filter((e) => e.locationId === targetLocationId).length
    if (atTarget / memberEntities.length >= 0.5) {
      locationId = targetLocationId
      targetLocationId = null
    }
  }

  return { ...group, locationId, targetLocationId, cohesion, lastUpdatedTick: tick }
}
