import type { LocationId, WorldId } from "@avatark/runtime-contracts"
import type { EmbodiedRegion } from "@avatark/world-embodiment-contracts"
import type { PatchState, TerritoryPressure, RouteState } from "@avatark/spatial-ecology-contracts"
import type { DayPhase, PlaceOccupancy, GroupRoutineIntent, ResourceOpportunity } from "@avatark/living-rhythms-contracts"
import type { WorldInstanceCanonicalProjectionState } from "@avatark/canonical-event-contracts"
import type { HistoricalMarker } from "@avatark/world-memory-contracts"
import type { NearbyDestination, PlaceCanonicalPresence, PlaceContinuityView, PresentationHint, VisitorPlaceContinuity } from "@avatark/world-experience-contracts"

// Build 04, mission §C. Pure recombination only -- every field on
// `ComposePlaceContinuityInput` is already resolved by the Host layer
// from an existing repository/resolver (PatchState, TerritoryPressure,
// PlaceOccupancy, canonical projections, historical markers, ...);
// this function never fetches anything itself, matching the exact
// "runtime package never queries simulation internals" discipline
// every peer *-runtime package in this repo already holds.
export interface ComposePlaceContinuityInput {
  worldId: WorldId
  locationId: LocationId
  tick: number
  season: { id: string; name: string }
  region: EmbodiedRegion
  patchState: PatchState | null
  territoryPressure: TerritoryPressure | null
  dayPhase: DayPhase
  occupancy: PlaceOccupancy
  groupRoutineIntents: GroupRoutineIntent[]
  resourceOpportunities: ResourceOpportunity[]
  nearbyDestinations: NearbyDestination[]
  routeStates: RouteState[]
  canonicalProjectionsAtThisPlace: WorldInstanceCanonicalProjectionState[]
  rememberedConsequences: HistoricalMarker[]
  presentationHints: PresentationHint[]
  visitor: VisitorPlaceContinuity
}

export function composePlaceContinuity(input: ComposePlaceContinuityInput): PlaceContinuityView {
  // Build 01/02's own Canon-safety distinction, restated structurally:
  // a canonical projection is presented as Approved Canon only when its
  // OWN provenance says so -- never inferred from status, never assumed.
  const canonicalPresence: PlaceCanonicalPresence[] = input.canonicalProjectionsAtThisPlace.map((projection) => ({
    canonicalEventId: projection.canonicalEventId,
    status: projection.status,
    isApprovedCanon: projection.provenance.canonDocIds.length > 0,
  }))

  return {
    worldId: input.worldId,
    locationId: input.locationId,
    tick: input.tick,
    season: input.season,
    region: input.region,
    patchState: input.patchState,
    territoryPressure: input.territoryPressure,
    dayPhase: input.dayPhase,
    occupancy: input.occupancy,
    groupRoutineIntents: input.groupRoutineIntents,
    resourceOpportunities: input.resourceOpportunities,
    nearbyEntities: [...input.region.entities],
    encounterOpportunities: [...input.region.encounters],
    nearbyDestinations: input.nearbyDestinations,
    routeStates: input.routeStates,
    canonicalPresence,
    rememberedConsequences: input.rememberedConsequences,
    presentationHints: input.presentationHints,
    visitor: input.visitor,
  }
}
