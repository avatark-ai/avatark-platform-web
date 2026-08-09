import type { EncounterOpportunity } from "@avatark/living-population-contracts"
import type { EntityId, ProtectedNarrativeProjection } from "@avatark/living-systems-contracts"
import type { RelationshipBand } from "@avatark/social-ecology-contracts"
import type { CausalReference } from "@avatark/world-memory-contracts"
import type { EncounterRealizationStatus } from "@avatark/encounter-realization-contracts"

// Sprint 14, Phase 6/7: a small, deterministic, bounded weight per
// causal factor -- the same "small nudge, never a sole driver"
// discipline `resolveRoutineBonus` (living-rhythms-runtime) already
// established. Weights sum to at most ~1.05, deliberately never
// reaching 2x the REALIZATION_THRESHOLD alone, so no single factor can
// force realization by itself; a realization always reflects multiple
// converging causal signals, matching the mission's own "avoid
// arbitrary random encounter generation... deterministic variation may
// resolve bounded ambiguity, it must not replace causality."
const ROUTINE_COMPATIBILITY_WEIGHT = 0.5
const GROUP_COHESION_WEIGHT = 0.2
const RESOURCE_OPPORTUNITY_BONUS = 0.15
const RELATIONSHIP_BIAS: Record<RelationshipBand, number> = { WEAK: 0.05, ESTABLISHED: 0.12, STRONG: 0.2 }

const REALIZATION_THRESHOLD = 0.6
const EXPIRATION_THRESHOLD = 0.25

export interface ResolveEncounterRealizationParams {
  opportunity: EncounterOpportunity
  protectedNarrative: ProtectedNarrativeProjection
  // Fresh, re-checked presence at THIS resolution tick -- never trusted
  // from the opportunity's own (possibly now-stale) snapshot, since an
  // opportunity computed earlier in the same wake's tick range may no
  // longer reflect who is actually still at the location.
  presentEntityIds: EntityId[]
  // The subset of presentEntityIds whose CURRENT activity is
  // stationary/engaging (REST/GRAZE/DRINK/SOCIALIZE/REMAIN), not
  // movement-shaped (MOVE_TO_RESOURCE/FOLLOW_GROUP/RETURN_TO_GROUP/
  // APPROACH_RELATED_ENTITY/RETURN_TO_HOME_RANGE) -- resolved by the
  // Host layer from EntityBehaviorState.activity, the same
  // engaged-vs-in-transit distinction `resolvePlaceOccupancy`
  // (living-rhythms-runtime) already uses for its own OCCUPANCY_LEVEL.
  routineCompatibleEntityIds: EntityId[]
  // [0, 1], from the participants' own shared GroupState.cohesion, if
  // any -- null when participants share no group.
  groupCohesion: number | null
  // The strongest relationship band among any participant pair, from
  // Sprint 12's own RelationshipState -- null when no relationship
  // exists between any two participants.
  relationshipBand: RelationshipBand | null
  // Whether a category-relevant ResourceOpportunity (living-rhythms-runtime)
  // is currently available at this location.
  resourceOpportunityAvailable: boolean
  // Sprint 7's own `deriveDeterministicVariation` output, in [0, 1) --
  // resolved by the Host layer from (worldId, worldVersion, tick,
  // locationId, seasonId, seed). Consulted ONLY inside the bounded
  // ambiguity band between EXPIRATION_THRESHOLD and
  // REALIZATION_THRESHOLD, never as the primary driver.
  variation: number
}

export interface EncounterRealizationResult {
  status: Extract<EncounterRealizationStatus, "REALIZED" | "EXPIRED" | "BLOCKED">
  causalReferences: CausalReference[]
  variationConsulted: number | null
}

// Sprint 14, Phase 6/7: the ONE place an AVAILABLE EncounterOpportunity
// becomes a REALIZED encounter or does not. Pure, deterministic --
// identical inputs always produce the identical output (the replay
// proof's own requirement). The renderer/visitor/Unreal never call this;
// only lib/encounterRealization/hostService.ts does, from inside the
// existing wake chain.
export function resolveEncounterRealization(params: ResolveEncounterRealizationParams): EncounterRealizationResult {
  const causalReferences: CausalReference[] = []

  // Hard gate, never overridden by any causal score: obeys the SAME
  // protected-narrative rule Sprint 7's own resolveAvailableEncounters
  // already enforces at the POTENTIAL layer -- re-checked here too
  // (defense in depth), so a future caller that ever constructs an
  // EncounterOpportunity outside that gate still cannot realize a
  // narrative-protected encounter.
  if (params.opportunity.category === "narrative-protected" && !params.protectedNarrative.resolved) {
    return { status: "BLOCKED", causalReferences: [{ kind: "protectedNarrative", ref: "unresolved" }], variationConsulted: null }
  }

  const stillPresent = params.opportunity.contributingEntityIds.filter((id) => params.presentEntityIds.includes(id))
  if (stillPresent.length === 0) {
    return { status: "EXPIRED", causalReferences: [{ kind: "presence", ref: "none-remaining" }], variationConsulted: null }
  }
  causalReferences.push({ kind: "presence", ref: String(stillPresent.length) })

  const compatibleCount = stillPresent.filter((id) => params.routineCompatibleEntityIds.includes(id)).length
  const compatibleFraction = compatibleCount / stillPresent.length
  causalReferences.push({ kind: "routineCompatibility", ref: compatibleFraction.toFixed(2) })

  let score = compatibleFraction * ROUTINE_COMPATIBILITY_WEIGHT

  if (params.groupCohesion !== null) {
    score += params.groupCohesion * GROUP_COHESION_WEIGHT
    causalReferences.push({ kind: "groupCohesion", ref: params.groupCohesion.toFixed(2) })
  }
  if (params.relationshipBand) {
    score += RELATIONSHIP_BIAS[params.relationshipBand]
    causalReferences.push({ kind: "relationshipBand", ref: params.relationshipBand })
  }
  if (params.resourceOpportunityAvailable) {
    score += RESOURCE_OPPORTUNITY_BONUS
    causalReferences.push({ kind: "resourceOpportunity", ref: "available" })
  }

  if (score >= REALIZATION_THRESHOLD) return { status: "REALIZED", causalReferences, variationConsulted: null }
  if (score < EXPIRATION_THRESHOLD) return { status: "EXPIRED", causalReferences, variationConsulted: null }

  // Bounded ambiguity band: the causal signal is real but not
  // conclusive on its own. `variation` breaks the tie PROPORTIONALLY TO
  // how strong the partial signal already is -- a score near
  // REALIZATION_THRESHOLD needs only a favorable variation to tip over;
  // a score near EXPIRATION_THRESHOLD needs an unusually favorable one.
  // This is "deterministic variation resolves bounded ambiguity," never
  // "deterministic variation replaces causality" (the mission's own
  // explicit distinction).
  const bandPosition = (score - EXPIRATION_THRESHOLD) / (REALIZATION_THRESHOLD - EXPIRATION_THRESHOLD)
  causalReferences.push({ kind: "deterministicVariation", ref: params.variation.toFixed(4) })
  const status = params.variation < bandPosition ? "REALIZED" : "EXPIRED"
  return { status, causalReferences, variationConsulted: params.variation }
}
