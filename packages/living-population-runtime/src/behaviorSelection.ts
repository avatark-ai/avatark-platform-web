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
// when two candidates score an identical utility. Sprint 12's two new
// social variants sit alongside the existing group-cohesion behaviors,
// after survival needs, before REMAIN.
const PRIORITY_ORDER: BehaviorType[] = ["DRINK", "GRAZE", "REST", "SOCIALIZE", "FOLLOW_GROUP", "RETURN_TO_GROUP", "APPROACH_RELATED_ENTITY", "RETURN_TO_HOME_RANGE", "MOVE_TO_RESOURCE", "REMAIN"]

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
  APPROACH_RELATED_ENTITY: "SOCIAL",
  RETURN_TO_HOME_RANGE: "RETURN",
  REMAIN: null,
}

function pressureOf(needs: NeedState[], dimension: NeedDimension | null): number {
  if (!dimension) return 0
  return needs.find((n) => n.dimension === dimension)?.pressure ?? 0
}

// Sprint 11, Phase 7: bounded, deterministic entity-memory influence.
// `preferredResourceLocationId` may only ever WIN AMONG candidates
// perception has already deemed reachable and viable this tick -- it
// can never make an unavailable or illegal location eligible. Memory
// influences WHICH viable option is chosen, never whether one exists.
export interface MemoryHint {
  preferredResourceLocationId: LocationId | null
}

// Sprint 12, Phase 9: bounded, deterministic social influence -- same
// discipline as MemoryHint above. `relatedEntityLocationId` and
// `homeRangeLocationIds` are candidates ONLY, still gated by
// `perception.reachableLocationIds`/`currentLocationId` before either
// can ever become the selected target -- social context can never make
// an illegal or unreachable location eligible.
export interface SocialContext {
  relatedEntityLocationId: LocationId | null
  homeRangeLocationIds: LocationId[]
  withinHomeRange: boolean
}

// Sprint 13, Phase 6: structurally identical to
// @avatark/living-rhythms-contracts' own `DayPhase`/`RoutineWindow` --
// population-runtime deliberately never depends on living-rhythms-*
// (the same decoupling MemoryHint/SocialContext already established for
// Sprint 11/12's own domains: the Host layer resolves which window
// applies before calling in, population-runtime only ever sees an
// already-resolved, opaque bag of facts). A caller may pass a real
// `DayPhase`/`RoutineWindow` value directly, since string-literal unions
// and matching object shapes are structurally compatible.
export type DayPhaseInput = "DAWN" | "MORNING" | "MIDDAY" | "AFTERNOON" | "DUSK" | "EVENING" | "NIGHT"

export interface RoutineWindowInput {
  dayPhase: DayPhaseInput
  eligibleActivities: BehaviorType[]
  socialAffinity: number
  restBias: number
  movementBias: number
}

export interface SelectBehaviorParams {
  entityId: EntityId
  profile: EntityBehaviorProfile
  needs: NeedState[]
  rhythmPhase: RhythmPhase
  perception: EntityPerception
  group: { locationId: LocationId; targetLocationId: LocationId | null } | null
  tick: number
  memoryHint?: MemoryHint | null
  socialContext?: SocialContext | null
  // Sprint 13, Phase 6: the world-shared day phase for THIS tick, paired
  // with the routine window (if any) that applies at that same phase.
  // `routineWindow` is only ever consulted when its own `dayPhase`
  // matches the given `dayPhase` -- an honest-default guard against a
  // caller accidentally passing a stale window from a prior phase,
  // never a silent misapplication (see resolveRoutineBonus's own
  // living-rhythms-runtime restatement below).
  dayPhase?: DayPhaseInput | null
  routineWindow?: RoutineWindowInput | null
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

  const preferredLocationId = params.memoryHint?.preferredResourceLocationId ?? null
  function preferMemoryOrFirst(reachable: LocationId[]): LocationId | null {
    if (preferredLocationId && reachable.includes(preferredLocationId)) return preferredLocationId
    return reachable[0] ?? null
  }
  const movementTarget = wantsWaterMove ? preferMemoryOrFirst(perception.reachableWaterLocationIds) : wantsVegetationMove ? preferMemoryOrFirst(perception.reachableVegetationLocationIds) : null

  const groupIsMoving = group !== null && group.targetLocationId !== null && group.targetLocationId !== perception.currentLocationId
  const awayFromGroup = group !== null && group.locationId !== perception.currentLocationId

  const social = params.socialContext ?? null
  const relatedEntityTarget = social?.relatedEntityLocationId && social.relatedEntityLocationId !== perception.currentLocationId && perception.reachableLocationIds.includes(social.relatedEntityLocationId) ? social.relatedEntityLocationId : null
  const homeRangeTarget =
    social && !social.withinHomeRange ? social.homeRangeLocationIds.find((id) => id !== perception.currentLocationId && perception.reachableLocationIds.includes(id)) ?? null : null

  const candidates: Candidate[] = [
    { type: "DRINK", dimension: "thirst", eligible: caps.has("can_drink") && perception.waterAvailable, targetLocationId: null },
    { type: "GRAZE", dimension: "hunger", eligible: caps.has("can_graze") && perception.vegetationAvailable, targetLocationId: null },
    { type: "REST", dimension: "rest", eligible: caps.has("can_rest"), targetLocationId: null },
    { type: "SOCIALIZE", dimension: "social", eligible: (caps.has("can_group") || caps.has("can_flock")) && (perception.groupId !== null || perception.nearbyEntityIds.length > 0), targetLocationId: null },
    { type: "MOVE_TO_RESOURCE", dimension: wantsWaterMove ? "thirst" : "hunger", eligible: caps.has("can_move") && movementTarget !== null, targetLocationId: movementTarget },
    { type: "FOLLOW_GROUP", dimension: null, eligible: caps.has("can_move") && groupIsMoving, targetLocationId: group?.targetLocationId ?? null },
    { type: "RETURN_TO_GROUP", dimension: null, eligible: caps.has("can_move") && awayFromGroup && !groupIsMoving, targetLocationId: group?.locationId ?? null },
    { type: "APPROACH_RELATED_ENTITY", dimension: null, eligible: caps.has("can_move") && relatedEntityTarget !== null, targetLocationId: relatedEntityTarget },
    { type: "RETURN_TO_HOME_RANGE", dimension: null, eligible: caps.has("can_move") && homeRangeTarget !== null, targetLocationId: homeRangeTarget },
  ]

  const eligible = candidates.filter((c) => c.eligible)

  const MOVEMENT_TYPES = new Set<BehaviorType>(["MOVE_TO_RESOURCE", "FOLLOW_GROUP", "RETURN_TO_GROUP", "APPROACH_RELATED_ENTITY", "RETURN_TO_HOME_RANGE"])

  // Sprint 13, Phase 6: a deliberate, documented RESTATEMENT of
  // @avatark/living-rhythms-runtime's own `resolveRoutineBonus` -- the
  // same "second, independent implementation of a similar rule" posture
  // Sprint 13's own resourceOpportunityResolution.ts already used for
  // perception.ts's rule (see docs/SPRINT13_GROUND_TRUTH.md's decision
  // 2), applied in the opposite direction here to avoid population-runtime
  // gaining a new dependency on living-rhythms-*. A candidate not named
  // in `eligibleActivities` gets ZERO bonus (tendency, never override).
  function routineBonusOf(candidateType: BehaviorType): number {
    const window = params.routineWindow
    if (!window || !params.dayPhase || window.dayPhase !== params.dayPhase) return 0
    if (!window.eligibleActivities.includes(candidateType)) return 0
    if (candidateType === "REST") return window.restBias
    if (candidateType === "SOCIALIZE") return window.socialAffinity
    if (MOVEMENT_TYPES.has(candidateType)) return window.movementBias
    return 0.1
  }

  function utility(candidate: Candidate): number {
    const base = pressureOf(needs, candidate.dimension)
    const rhythmBonus = NATURAL_PHASE[candidate.type] === rhythmPhase ? 0.3 : 0
    // FOLLOW_GROUP/RETURN_TO_GROUP/APPROACH_RELATED_ENTITY/RETURN_TO_HOME_RANGE
    // have no need dimension of their own -- a fixed, modest utility
    // keeps social cohesion alive even when no individual need is
    // urgent, without ever outscoring a genuinely urgent survival need.
    const socialBaseline = candidate.type === "FOLLOW_GROUP" || candidate.type === "RETURN_TO_GROUP" || candidate.type === "APPROACH_RELATED_ENTITY" || candidate.type === "RETURN_TO_HOME_RANGE" ? 0.2 : 0
    return base + rhythmBonus + socialBaseline + routineBonusOf(candidate.type)
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
