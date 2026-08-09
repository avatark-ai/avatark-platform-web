import type { BehaviorIntent, BehaviorType, EntityBehaviorProfile, EntityPerception, NeedDimension, NeedState, RhythmPhase } from "@avatark/living-population-contracts"
import type { EntityId } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"

interface Candidate {
  type: BehaviorType
  dimension: NeedDimension | null
  eligible: boolean
  targetLocationId: LocationId | null
}

// Fixed, deterministic tie-break order -- survival-adjacent behaviors
// before social ones, movement before passive remaining. Only consulted
// when two candidates score an identical utility.
const PRIORITY_ORDER: BehaviorType[] = ["DRINK", "GRAZE", "REST", "SOCIALIZE", "FOLLOW_GROUP", "RETURN_TO_GROUP", "MOVE_TO_RESOURCE", "REMAIN"]

// A candidate's utility is boosted when the current rhythm phase
// "naturally" calls for it -- but never gated by it alone: an urgent
// need's own pressure can still win outside its natural phase (Phase
// 4/6's own "needs can override rhythm").
const NATURAL_PHASE: Record<BehaviorType, RhythmPhase | null> = {
  GRAZE: "FORAGE",
  DRINK: "DRINK",
  REST: "REST",
  SOCIALIZE: "SOCIAL",
  MOVE_TO_RESOURCE: "MOVE",
  FOLLOW_GROUP: "MOVE",
  RETURN_TO_GROUP: "RETURN",
  REMAIN: null,
}

function pressureOf(needs: NeedState[], dimension: NeedDimension | null): number {
  if (!dimension) return 0
  return needs.find((n) => n.dimension === dimension)?.pressure ?? 0
}

export interface SelectBehaviorParams {
  entityId: EntityId
  profile: EntityBehaviorProfile
  needs: NeedState[]
  rhythmPhase: RhythmPhase
  perception: EntityPerception
  group: { locationId: LocationId; targetLocationId: LocationId | null } | null
  tick: number
}

// Sprint 10, Phase 6: needs + rhythm + perception + environmental
// constraints (perception already encodes the causal environment's
// effect on availability) -> candidate behaviors -> eligibility ->
// deterministic utility resolution -> BehaviorIntent. No behavior tree
// framework, no generative agent, no LLM -- a fixed candidate list
// scored by a pure arithmetic rule, tie-broken by a fixed order.
export function selectBehavior(params: SelectBehaviorParams): BehaviorIntent {
  const { profile, needs, rhythmPhase, perception, group } = params
  const caps = new Set(profile.capabilities)

  const wantsWaterMove = !perception.waterAvailable && perception.reachableWaterLocationIds.length > 0
  const wantsVegetationMove = !perception.vegetationAvailable && perception.reachableVegetationLocationIds.length > 0
  const movementTarget = wantsWaterMove ? perception.reachableWaterLocationIds[0] : wantsVegetationMove ? perception.reachableVegetationLocationIds[0] : null

  const groupIsMoving = group !== null && group.targetLocationId !== null && group.targetLocationId !== perception.currentLocationId
  const awayFromGroup = group !== null && group.locationId !== perception.currentLocationId

  const candidates: Candidate[] = [
    { type: "DRINK", dimension: "thirst", eligible: caps.has("can_drink") && perception.waterAvailable, targetLocationId: null },
    { type: "GRAZE", dimension: "hunger", eligible: caps.has("can_graze") && perception.vegetationAvailable, targetLocationId: null },
    { type: "REST", dimension: "rest", eligible: caps.has("can_rest"), targetLocationId: null },
    { type: "SOCIALIZE", dimension: "social", eligible: (caps.has("can_group") || caps.has("can_flock")) && (perception.groupId !== null || perception.nearbyEntityIds.length > 0), targetLocationId: null },
    { type: "MOVE_TO_RESOURCE", dimension: wantsWaterMove ? "thirst" : "hunger", eligible: caps.has("can_move") && movementTarget !== null, targetLocationId: movementTarget },
    { type: "FOLLOW_GROUP", dimension: null, eligible: caps.has("can_move") && groupIsMoving, targetLocationId: group?.targetLocationId ?? null },
    { type: "RETURN_TO_GROUP", dimension: null, eligible: caps.has("can_move") && awayFromGroup && !groupIsMoving, targetLocationId: group?.locationId ?? null },
  ]

  const eligible = candidates.filter((c) => c.eligible)

  function utility(candidate: Candidate): number {
    const base = pressureOf(needs, candidate.dimension)
    const rhythmBonus = NATURAL_PHASE[candidate.type] === rhythmPhase ? 0.3 : 0
    // FOLLOW_GROUP/RETURN_TO_GROUP have no need dimension of their own --
    // a fixed, modest utility keeps group cohesion alive even when no
    // individual need is urgent, without ever outscoring a genuinely
    // urgent survival need.
    const groupCohesionBaseline = candidate.type === "FOLLOW_GROUP" || candidate.type === "RETURN_TO_GROUP" ? 0.2 : 0
    return base + rhythmBonus + groupCohesionBaseline
  }

  let best: Candidate = { type: "REMAIN", dimension: null, eligible: true, targetLocationId: null }
  let bestUtility = 0.05 // REMAIN's own small baseline -- only beaten by a real candidate

  for (const candidate of eligible) {
    const score = utility(candidate)
    const better = score > bestUtility || (score === bestUtility && PRIORITY_ORDER.indexOf(candidate.type) < PRIORITY_ORDER.indexOf(best.type))
    if (better) {
      best = candidate
      bestUtility = score
    }
  }

  return { entityId: params.entityId, type: best.type, targetLocationId: best.targetLocationId, tick: params.tick }
}
