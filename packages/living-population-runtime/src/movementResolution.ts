import type { BehaviorIntent, EntityPerception, MovementIntent } from "@avatark/living-population-contracts"

export class IllegalMovementError extends Error {
  constructor(entityId: string, targetLocationId: string, currentLocationId: string) {
    super(`entity ${entityId} cannot move to "${targetLocationId}" from "${currentLocationId}" -- not the current location and not a reachable neighbor`)
    this.name = "IllegalMovementError"
  }
}

// Sprint 10, Phase 7: translates a BehaviorIntent into a SEMANTIC
// MovementIntent -- no coordinates. `targetLocationId` must always be
// either the entity's current location or one of `perception`'s own
// `reachableLocationIds`, which are themselves derived from the world
// graph (never invented by this function) -- legality is checked
// explicitly rather than trusted, so a bug upstream that produced an
// illegal target fails loudly here instead of silently teleporting an
// entity off the graph.
export function resolveMovementIntent(intent: BehaviorIntent, perception: EntityPerception): MovementIntent {
  const legalTargets = new Set([perception.currentLocationId, ...perception.reachableLocationIds])

  function assertLegal(targetLocationId: string | null): string | null {
    if (targetLocationId === null) return null
    if (!legalTargets.has(targetLocationId)) throw new IllegalMovementError(intent.entityId, targetLocationId, perception.currentLocationId)
    return targetLocationId
  }

  switch (intent.type) {
    case "MOVE_TO_RESOURCE":
      return { entityId: intent.entityId, type: "ApproachResource", targetLocationId: assertLegal(intent.targetLocationId) }
    case "FOLLOW_GROUP":
      return { entityId: intent.entityId, type: "FollowGroup", targetLocationId: assertLegal(intent.targetLocationId) }
    case "RETURN_TO_GROUP":
      return { entityId: intent.entityId, type: "ReturnToGroup", targetLocationId: assertLegal(intent.targetLocationId) }
    default:
      return { entityId: intent.entityId, type: "Remain", targetLocationId: null }
  }
}
