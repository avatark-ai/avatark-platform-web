import type { EncounterRuleId, EntityId } from "@avatark/living-systems-contracts"
import type { EnvironmentalState } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"
import type { GroupId, ResourceTag } from "./ids.ts"

// Sprint 10, Phase 5: bounded, renderer-neutral, semantic perception --
// a PROJECTION of authoritative Living Systems state, never a sensor.
// No computer vision, no raycast, no direct query into a renderer.
// Everything here is derivable from data Living Systems and the world
// graph already expose.
export interface LocationResourceAffordance {
  locationId: LocationId
  resourceTags: ResourceTag[]
}

export interface EntityPerception {
  entityId: EntityId
  currentLocationId: LocationId
  reachableLocationIds: LocationId[]
  localEnvironment: EnvironmentalState
  waterAvailable: boolean
  vegetationAvailable: boolean
  /** Reachable locations where water/vegetation is currently available,
   * respectively -- what a MOVE_TO_RESOURCE behavior can target. Empty
   * when the resource is nowhere reachable this tick (a genuine,
   * visible consequence of a harsh season, not hidden from the entity's
   * own perception). */
  reachableWaterLocationIds: LocationId[]
  reachableVegetationLocationIds: LocationId[]
  nearbyEntityIds: EntityId[]
  groupId: GroupId | null
  availableEncounterRuleIds: EncounterRuleId[]
}
