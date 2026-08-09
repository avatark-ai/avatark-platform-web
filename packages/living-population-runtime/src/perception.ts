import { resolveAvailableEncounters } from "@avatark/living-systems-runtime"
import type { EncounterRule, EnvironmentalState, LivingEntityState, ProtectedNarrativeProjection } from "@avatark/living-systems-contracts"
import type { EntityPerception, GroupId, LocationResourceAffordance, ResourceTag, WorldLocationGraph } from "@avatark/living-population-contracts"
import { reachableNeighbors } from "./locationGraph.ts"

function hasTag(affordances: LocationResourceAffordance[], locationId: string, tag: ResourceTag): boolean {
  return affordances.some((a) => a.locationId === locationId && a.resourceTags.includes(tag))
}

// Sprint 10, Phase 5: a bounded, semantic PROJECTION of authoritative
// Living Systems state -- reuses Sprint 7's own resolveAvailableEncounters
// unmodified for the encounter-affordance field (never a second
// encounter-resolution mechanism), and derives resource availability by
// gating a location's static resource TAG against the current causal
// environment band -- the same location can genuinely stop offering
// water/vegetation once hydrology/ecology degrade, without any location
// or tag changing (Phase 9's own "must not merely swap labels").
export interface ResolvePerceptionParams {
  entity: LivingEntityState
  worldLocationGraph: WorldLocationGraph
  resourceAffordances: LocationResourceAffordance[]
  environment: EnvironmentalState
  allEntities: LivingEntityState[]
  groupsByEntityId: ReadonlyMap<string, GroupId>
  encounterRules: EncounterRule[]
  protectedNarrative: ProtectedNarrativeProjection
}

export function resolvePerception(params: ResolvePerceptionParams): EntityPerception {
  const { entity } = params
  const reachableLocationIds = reachableNeighbors(params.worldLocationGraph, entity.locationId)
  const candidateLocationIds = [entity.locationId, ...reachableLocationIds]

  const waterOk = params.environment.hydrology.hydrologyBand !== "low"
  const vegetationOk = params.environment.ecology.vegetationActivityBand !== "low"

  const reachableWaterLocationIds = waterOk ? candidateLocationIds.filter((id) => hasTag(params.resourceAffordances, id, "water")) : []
  const reachableVegetationLocationIds = vegetationOk ? candidateLocationIds.filter((id) => hasTag(params.resourceAffordances, id, "vegetation")) : []

  const availableEncounters = resolveAvailableEncounters(params.encounterRules, entity.locationId, params.environment, params.protectedNarrative)

  return {
    entityId: entity.id,
    currentLocationId: entity.locationId,
    reachableLocationIds,
    localEnvironment: params.environment,
    waterAvailable: reachableWaterLocationIds.includes(entity.locationId),
    vegetationAvailable: reachableVegetationLocationIds.includes(entity.locationId),
    reachableWaterLocationIds,
    reachableVegetationLocationIds,
    nearbyEntityIds: params.allEntities.filter((other) => other.id !== entity.id && other.locationId === entity.locationId).map((other) => other.id),
    groupId: params.groupsByEntityId.get(entity.id) ?? null,
    availableEncounterRuleIds: availableEncounters.map((e) => e.ruleId),
  }
}
