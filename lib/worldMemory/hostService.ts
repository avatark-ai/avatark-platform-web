import {
  computeReturnRecognition,
  deriveEntityMemoryEntries,
  deriveWorldEvents,
  resolveEmergentEncounterOpportunities,
  resolvePreferredResourceLocation,
  trackEncounterHistory,
} from "@avatark/world-memory-runtime"
import type { EncounterHistoryEntry, EncounterHistoryStatus, EntityMemoryEntry, HistoricalMarker, ReturnRecognition, WorldEvent } from "@avatark/world-memory-contracts"
import type { EnvironmentalState } from "@avatark/living-systems-contracts"
import type { LocationResourceAffordance } from "@avatark/living-population-contracts"
import type { MemoryHint } from "@avatark/living-population-runtime"
import type { WorldEmbodimentSnapshot } from "@avatark/world-embodiment-contracts"
import { getWorldState } from "../worldPersistence/hostService.ts"
import { getPopulationEmbodimentSnapshot, getPopulationSnapshot, wakeWorldWithPopulation } from "../livingPopulation/hostService.ts"
import type { WakeWorldWithPopulationResult } from "../livingPopulation/hostService.ts"
import { VRINDAVAN_RESOURCE_AFFORDANCES } from "../livingPopulation/vrindavanPopulationDefinition.ts"
import { deriveMemoryRecordId } from "@avatark/world-memory-runtime"
import { encounterHistoryRepository, entityMemoryRepository, historicalMarkerRepository, worldEventRepository } from "./singleton.ts"
import { VRINDAVAN_EMERGENT_ENCOUNTER_RULES, VRINDAVAN_SIGNIFICANCE_CONFIG } from "./vrindavanMemoryDefinition.ts"

const defaultNow = () => new Date().toISOString()

function computeBandChanges(before: EnvironmentalState, after: EnvironmentalState, tick: number) {
  const pairs: [string, string, string][] = [
    ["temperatureBand", before.weather.temperatureBand, after.weather.temperatureBand],
    ["hydrologyBand", before.hydrology.hydrologyBand, after.hydrology.hydrologyBand],
    ["vegetationActivityBand", before.ecology.vegetationActivityBand, after.ecology.vegetationActivityBand],
    ["animalActivityBand", before.ecology.animalActivityBand, after.ecology.animalActivityBand],
  ]
  return pairs.filter(([, fromBand, toBand]) => fromBand !== toBand).map(([band, fromBand, toBand]) => ({ tick, band, fromBand, toBand }))
}

// Sprint 11, Phase 3/4: the SAME simple availability rule
// @avatark/living-population-runtime's own perception.ts already uses
// (a resource tag gated by the band that governs it) -- restated here,
// at the Host layer, only because World Memory must never depend on
// living-population-RUNTIME internals (see docs/SPRINT11_GROUND_TRUTH.md's
// dependency-direction decision).
function computeLocationConditionsByCategory(environment: EnvironmentalState, affordances: LocationResourceAffordance[]): Map<string, boolean> {
  const map = new Map<string, boolean>()
  for (const affordance of affordances) {
    if (affordance.resourceTags.includes("water")) map.set(`${affordance.locationId}:water`, environment.hydrology.hydrologyBand !== "low")
    if (affordance.resourceTags.includes("vegetation")) map.set(`${affordance.locationId}:vegetation`, environment.ecology.vegetationActivityBand !== "low")
  }
  return map
}

export interface WakeWorldWithMemoryResult {
  world: WakeWorldWithPopulationResult["world"]
  population: WakeWorldWithPopulationResult["population"]
  worldEvents: WorldEvent[]
  entityMemoryEntries: EntityMemoryEntry[]
  encounterHistoryEntries: EncounterHistoryEntry[]
}

// Sprint 11, Phase 12: the one place Sprint 9's world catch-up, Sprint
// 10's population catch-up, AND Sprint 11's memory derivation are all
// driven by the SAME wake -- "visitor leaves -> world unobserved ->
// season/environment changes -> population behavior changes ->
// meaningful systemic event occurs -> World Memory records it -> Entity
// Memory records only relevant entity history -> encounter availability
// changes" (the mission's own Phase 27 chain), in one function call.
export async function wakeWorldWithMemory(worldInstanceId: string, ownerId: string, now: () => string = defaultNow): Promise<WakeWorldWithMemoryResult> {
  const beforeShared = await getWorldState(worldInstanceId, now)
  const beforePopulation = await getPopulationSnapshot(worldInstanceId, now)

  // Phase 7: resolve each entity's own memory hint BEFORE advancing --
  // population's behaviorSelection only ever sees a hint that already
  // existed prior to this tick range, never one derived from ticks it
  // hasn't lived through yet.
  const memoryHintByEntityId = new Map<string, MemoryHint>()
  for (const entity of beforePopulation.entities) {
    const entries = await entityMemoryRepository.list(worldInstanceId, entity.entityId)
    const preferred = resolvePreferredResourceLocation(entries)
    if (preferred) memoryHintByEntityId.set(entity.entityId, { preferredResourceLocationId: preferred })
  }

  const combined = await wakeWorldWithPopulation(worldInstanceId, ownerId, now, memoryHintByEntityId)
  const afterShared = combined.world.state.sharedState
  const afterTick = afterShared.clock.tick
  const afterPopulation = await getPopulationSnapshot(worldInstanceId, now)

  const seasonTransitions =
    beforeShared.sharedState.season.currentSeasonId !== afterShared.season.currentSeasonId
      ? [{ tick: afterTick, fromSeasonId: beforeShared.sharedState.season.currentSeasonId, toSeasonId: afterShared.season.currentSeasonId }]
      : []
  const environmentalBandChanges = computeBandChanges(beforeShared.sharedState.environment, afterShared.environment, afterTick)

  const beforeConditions = computeLocationConditionsByCategory(beforeShared.sharedState.environment, VRINDAVAN_RESOURCE_AFFORDANCES)
  const afterConditions = computeLocationConditionsByCategory(afterShared.environment, VRINDAVAN_RESOURCE_AFFORDANCES)
  const locationConditionChanges = [...afterConditions.entries()]
    .filter(([key, isAvailable]) => beforeConditions.has(key) && beforeConditions.get(key) !== isAvailable)
    .map(([key, isAvailable]) => {
      const [locationId, category] = key.split(":")
      return { tick: afterTick, locationId, category, wasAvailable: beforeConditions.get(key)!, isAvailable, entityIdsPresent: afterPopulation.entities.filter((e) => e.locationId === locationId).map((e) => e.entityId) }
    })

  const beforeOpportunityKeys = new Set(beforePopulation.encounterOpportunities.map((o) => `${o.ruleId}:${o.locationId}`))
  const encounterAvailabilityChanges = afterPopulation.encounterOpportunities
    .filter((o) => !beforeOpportunityKeys.has(`${o.ruleId}:${o.locationId}`))
    .map((o) => ({ tick: afterTick, ruleId: o.ruleId, locationId: o.locationId, category: o.category, becameAvailable: true, contributingEntityIds: o.contributingEntityIds }))

  const worldEvents = deriveWorldEvents({
    worldId: worldInstanceId,
    now,
    seasonTransitions,
    environmentalBandChanges,
    locationConditionChanges,
    populationEvents: combined.population.populationEvents,
    encounterAvailabilityChanges,
    significanceConfig: VRINDAVAN_SIGNIFICANCE_CONFIG,
  })
  for (const event of worldEvents) await worldEventRepository.append(event)

  worldEvents.forEach((event, eventIndex) => {
    event.consequences.forEach((consequence, consequenceIndex) => {
      if (consequence.type !== "LOCATION_HISTORY_MARKER" || !consequence.targetLocationId) return
      const marker: HistoricalMarker = {
        id: deriveMemoryRecordId(worldInstanceId, event.tick, `${event.id}:marker`, event.causalReferences, [String(eventIndex), String(consequenceIndex)], consequenceIndex),
        worldId: worldInstanceId,
        locationId: consequence.targetLocationId,
        tick: event.tick,
        category: String(consequence.detail.category ?? consequence.type),
        detail: consequence.detail,
        provenance: { derivedFromEventIds: [event.id], derivationRule: "consequence.LOCATION_HISTORY_MARKER", causalReferences: event.causalReferences },
      }
      historicalMarkerRepository.append(marker)
    })
  })

  const entityMemoryEntries = deriveEntityMemoryEntries(worldInstanceId, worldEvents)
  for (const entry of entityMemoryEntries) await entityMemoryRepository.append(entry)

  const encounterHistoryEntries = trackEncounterHistory(worldInstanceId, beforePopulation.encounterOpportunities, afterPopulation.encounterOpportunities, afterTick)
  for (const entry of encounterHistoryEntries) await encounterHistoryRepository.append(entry)

  return { world: combined.world, population: combined.population, worldEvents, entityMemoryEntries, encounterHistoryEntries }
}

// Sprint 11, Phase 11: derived entirely from World Memory events since
// the visitor's own last-known tick -- never generated prose.
export async function getReturnRecognition(worldInstanceId: string, userId: string, sinceTick: number, now: () => string = defaultNow): Promise<ReturnRecognition> {
  const state = await getWorldState(worldInstanceId, now)
  const events = await worldEventRepository.listSince(worldInstanceId, sinceTick)
  return computeReturnRecognition(worldInstanceId, userId, sinceTick, state.sharedState.clock.tick, events)
}

// Sprint 11, Phase 9: the live emergent-encounter surface -- Sprint
// 7/10's own base computation (already inside `population.
// encounterOpportunities`) plus a conditional, history-gated second
// pass, never a change to either existing function.
export async function getEmergentEncounterOpportunities(worldInstanceId: string, now: () => string = defaultNow) {
  const population = await getPopulationSnapshot(worldInstanceId, now)
  const state = await getWorldState(worldInstanceId, now)
  const events = await worldEventRepository.listSince(worldInstanceId, 0)

  const presenceByLocation: Record<string, string[]> = {}
  for (const entity of population.entities) {
    if (!presenceByLocation[entity.locationId]) presenceByLocation[entity.locationId] = []
    presenceByLocation[entity.locationId].push(entity.entityId)
  }

  return resolveEmergentEncounterOpportunities({
    baseOpportunities: population.encounterOpportunities,
    worldEvents: events,
    presenceByLocation,
    rules: VRINDAVAN_EMERGENT_ENCOUNTER_RULES,
    currentTick: state.sharedState.clock.tick,
  })
}

// Sprint 11, Phase 20: Host-level composition ONLY -- never a widening
// of @avatark/world-embodiment-contracts a second time (see
// docs/SPRINT11_GROUND_TRUTH.md's embodiment-integration decision). The
// renderer receives this projection; it never queries
// worldEventRepository/entityMemoryRepository/etc itself.
export interface WorldEmbodimentSnapshotWithHistory {
  embodiment: WorldEmbodimentSnapshot
  history: {
    recentWorldChanges: WorldEvent[]
    historicalMarkers: HistoricalMarker[]
    returnRecognition: ReturnRecognition | null
    encounterHistoryState: { ruleId: string; status: EncounterHistoryStatus | null }[]
  }
}

export async function getEmbodimentWithHistory(worldInstanceId: string, userId: string, locationId: string, reachableLocationIds: string[], sinceTick: number | null, now: () => string = defaultNow): Promise<WorldEmbodimentSnapshotWithHistory> {
  const embodiment = await getPopulationEmbodimentSnapshot(worldInstanceId, userId, locationId, reachableLocationIds, now)
  const recentWorldChanges = await worldEventRepository.listRecent(worldInstanceId, 10)
  const historicalMarkers = await historicalMarkerRepository.listByLocation(worldInstanceId, locationId)
  const returnRecognition = sinceTick !== null ? await getReturnRecognition(worldInstanceId, userId, sinceTick, now) : null

  const ruleIds = [...new Set(embodiment.current.encounters.map((e) => e.ruleId))]
  const encounterHistoryState = await Promise.all(ruleIds.map(async (ruleId) => ({ ruleId, status: await encounterHistoryRepository.latestStatus(worldInstanceId, ruleId) })))

  return { embodiment, history: { recentWorldChanges, historicalMarkers, returnRecognition, encounterHistoryState } }
}
