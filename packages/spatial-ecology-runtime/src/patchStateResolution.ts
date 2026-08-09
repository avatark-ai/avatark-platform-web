import type { EnvironmentalState } from "@avatark/living-systems-contracts"
import type { PlaceOccupancy, ResourceOpportunity } from "@avatark/living-rhythms-contracts"
import type { AdaptationEffect } from "@avatark/world-adaptation-contracts"
import type { PatchDefinition, PatchState, SpatialEdge } from "@avatark/spatial-ecology-contracts"
import { resolveMovementPermeability } from "./topologyResolution.ts"
import { rollupPatchOccupancy } from "./occupancyRollup.ts"
import { resolvePlaceEffectLocationId } from "./adaptationEffectLocation.ts"

export interface ResolvePatchStateParams {
  patch: PatchDefinition
  tick: number
  environment: EnvironmentalState
  /** The world's currently-resolved ResourceOpportunity set (Sprint 13's
   * own `resolveResourceOpportunities`) -- filtered here to this Patch's
   * own `containedLocationIds`. */
  resourceOpportunities: ResourceOpportunity[]
  /** One PlaceOccupancy per LocationId (Sprint 13's own
   * `resolvePlaceOccupancy`), already resolved by the caller --
   * filtered here to this Patch's own `containedLocationIds`. */
  placeOccupancies: PlaceOccupancy[]
  /** The world's full spatial topology -- used only to compute this
   * Patch's own permeability. */
  edges: SpatialEdge[]
  /** The world's currently-persisted PLACE-domain Sprint 15
   * AdaptationEffects -- filtered here to this Patch's own
   * `containedLocationIds`. */
  placeAdaptationEffects: AdaptationEffect[]
}

// Sprint 16 Phase 0 architecture, section 9/14: Patch state is ALWAYS a
// pure, stateless derivation from already-authoritative Living Systems/
// Rhythms/Adaptation state plus this Patch's own static definition and
// topology -- never a second causal engine, never persisted. Calling
// this function twice against the identical inputs always returns the
// identical result (replay-safe by construction, no repository
// involved).
export function resolvePatchState(params: ResolvePatchStateParams): PatchState {
  const containedLocationIds = new Set(params.patch.containedLocationIds)

  const resourceAvailability = [
    ...new Set(
      params.resourceOpportunities.filter((opportunity) => containedLocationIds.has(opportunity.locationId) && opportunity.available).map((opportunity) => opportunity.category),
    ),
  ]

  const occupancies = params.placeOccupancies.filter((occupancy) => containedLocationIds.has(occupancy.locationId))
  const rollup = rollupPatchOccupancy(occupancies)

  const relevantEffects = params.placeAdaptationEffects.filter((effect) => effect.domain === "PLACE" && containedLocationIds.has(resolvePlaceEffectLocationId(effect)))

  return {
    patchId: params.patch.id,
    tick: params.tick,
    // Sprint 7's own single world-global EnvironmentalState, passed
    // through unchanged -- see Sprint 16 Phase 0 architecture, section
    // 14: differentiated per-habitat weighting is NOT invented here
    // because no Canon-authorized basis for it exists yet. What DOES
    // differ per Patch is resourceAvailability/occupancy/permeability
    // below, which are genuinely Patch-specific.
    vegetationCondition: params.environment.ecology.vegetationActivityBand,
    hydrologyCondition: params.environment.hydrology.hydrologyBand,
    resourceAvailability,
    occupancyLevel: rollup.occupancyLevel,
    presentEntityIds: rollup.presentEntityIds,
    presentGroupIds: rollup.presentGroupIds,
    movementPermeability: resolveMovementPermeability(params.edges, params.patch.id),
    ecologicalPressure: relevantEffects.length > 0 ? 1 : 0,
  }
}
