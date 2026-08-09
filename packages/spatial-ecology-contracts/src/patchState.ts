import type { EnvironmentalBand } from "@avatark/living-systems-contracts"
import type { EntityId } from "@avatark/living-systems-contracts"
import type { ResourceTag, GroupId } from "@avatark/living-population-contracts"
import type { OccupancyLevel } from "@avatark/living-rhythms-contracts"
import type { PatchId } from "./ids.ts"

// Sprint 16 Phase 0 architecture, section 9/14: Patch is the primary
// ecological OPERATIONAL unit, and its dynamic state is ALWAYS a
// derived transform of authoritative Living Systems/Population/Rhythms
// state -- never a second, independently-simulated value, and never
// itself persisted (no repository, no `save`; the same posture
// PlaceOccupancy/PlaceAttachment/HistoricalCondition already hold).
// Every field below names a specific, already-owned source:
//
//   vegetationCondition / hydrologyCondition  <- Sprint 7 EnvironmentalState
//   resourceAvailability                      <- Sprint 13 ResourceOpportunity
//   occupancyLevel / presentEntityIds/GroupIds <- Sprint 13 PlaceOccupancy, rolled up
//   movementPermeability                      <- Sprint 16 SpatialEdge traversability
//   ecologicalPressure                        <- Sprint 15 AdaptationEffect (PLACE domain), if any
//
// Deliberately NOT an unrestricted property bag -- every field is a
// named, derivable quantity with a stated source (Sprint 16 mission's
// own explicit constraint).
export interface PatchState {
  patchId: PatchId
  tick: number
  vegetationCondition: EnvironmentalBand
  hydrologyCondition: EnvironmentalBand
  /** The union of ResourceTag categories currently AVAILABLE (per Sprint
   * 13's own resolveResourceOpportunities) at any LocationId this Patch
   * contains. */
  resourceAvailability: ResourceTag[]
  occupancyLevel: OccupancyLevel
  presentEntityIds: EntityId[]
  presentGroupIds: GroupId[]
  /** 0 (impassable) .. 1 (fully open) -- the fraction of this Patch's
   * own topology edges that are currently traversable. 1 when the
   * Patch has no edges at all (nothing to block movement). */
  movementPermeability: number
  /** 0 (none) .. 1 (present) -- whether a currently-active, PLACE-domain
   * Sprint 15 AdaptationEffect (RESOURCE_PRESSURE or
   * ENCOUNTER_ELIGIBILITY) targets any LocationId this Patch contains.
   * Deliberately boolean-as-number, not a fabricated continuous score --
   * Sprint 15 does not itself expose a magnitude beyond "this effect is
   * currently in force." */
  ecologicalPressure: number
}
