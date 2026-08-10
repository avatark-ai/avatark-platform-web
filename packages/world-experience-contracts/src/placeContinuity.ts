import type { LocationId, WorldId } from "@avatark/runtime-contracts"
import type { EmbodiedRegion, EntityPresentation, EncounterPresentation } from "@avatark/world-embodiment-contracts"
import type { PatchState, TerritoryPressure, RouteState } from "@avatark/spatial-ecology-contracts"
import type { DayPhase, PlaceOccupancy, GroupRoutineIntent, ResourceOpportunity } from "@avatark/living-rhythms-contracts"
import type { WorldInstanceCanonicalProjectionState } from "@avatark/canonical-event-contracts"
import type { HistoricalMarker } from "@avatark/world-memory-contracts"

// Build 04, mission §C: what a PLACE exposes to a visitor, composed
// entirely from already-authoritative runtime state (Sprint 9-20 +
// Build 01-03) -- never a second, parallel world-state store. Every
// field here is either a re-export of an existing contract shape or a
// small derived label over one; nothing here is itself persisted.

export interface NearbyDestination {
  locationId: LocationId
  reachable: boolean
  viaRouteId: string | null
  routeTraversable: boolean | null
}

export interface PlaceCanonicalPresence {
  canonicalEventId: string
  status: WorldInstanceCanonicalProjectionState["status"]
  /** Derived from `provenance.canonDocIds.length > 0` -- the same
   * Canon-safety distinction Build 01/02 already established at the
   * source level (an Approved artifact rule vs. a Host-authored
   * fixture). Never presented as Approved Canon unless the provenance
   * itself says so. */
  isApprovedCanon: boolean
}

export interface PresentationHint {
  kind: string
  id: string
  label: string
}

// Privacy-safe only: counts and flags, never reflection content, never
// another visitor's data. Mirrors VisitorContextProjection's own
// existing restraint (Sprint 8), extended with the one additional fact
// Build 04 needs (`hasVisitedBefore`) that VisitorContextProjection
// does not itself carry.
export interface VisitorPlaceContinuity {
  userId: string
  hasVisitedBefore: boolean
  meaningfulEncounterCount: number
  reflectionCount: number
}

export interface PlaceContinuityView {
  worldId: WorldId
  locationId: LocationId
  tick: number
  season: { id: string; name: string }
  region: Readonly<EmbodiedRegion>
  patchState: PatchState | null
  territoryPressure: TerritoryPressure | null
  dayPhase: DayPhase
  occupancy: PlaceOccupancy
  groupRoutineIntents: GroupRoutineIntent[]
  resourceOpportunities: ResourceOpportunity[]
  nearbyEntities: EntityPresentation[]
  encounterOpportunities: EncounterPresentation[]
  nearbyDestinations: NearbyDestination[]
  routeStates: RouteState[]
  canonicalPresence: PlaceCanonicalPresence[]
  rememberedConsequences: HistoricalMarker[]
  presentationHints: PresentationHint[]
  visitor: VisitorPlaceContinuity
}
