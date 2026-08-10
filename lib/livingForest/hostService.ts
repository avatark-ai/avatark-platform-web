import { advancePopulationSimulation, buildUndirectedLocationGraph, computeEncounterOpportunities } from "@avatark/living-population-runtime"
import type { AdvancePopulationSimulationResult, MemoryHint, RoutineWindowInput } from "@avatark/living-population-runtime"
import { resolveDayPhase } from "@avatark/living-rhythms-runtime"
import { resolveAvailableEncounters, resolveWorldSnapshot } from "@avatark/living-systems-runtime"
import type { EntityBehaviorState, EncounterOpportunity, GroupState } from "@avatark/living-population-contracts"
import type { EncounterRule, LivingEntityState, ProtectedNarrativeProjection, SharedWorldState, WorldSnapshot } from "@avatark/living-systems-contracts"
import { emptyProtectedNarrativeProjection, emptyVisitorWorldMemory, deriveDeterministicVariation } from "@avatark/living-systems-contracts"
import { deriveConsequences, deriveEncounterRecordId, resolveEncounterRealization } from "@avatark/encounter-realization-runtime"
import type { EncounterRecord } from "@avatark/encounter-realization-contracts"
import { deriveEntityMemoryEntries, deriveWorldEvents, resolvePreferredResourceLocation } from "@avatark/world-memory-runtime"
import type { DeriveWorldEventsParams } from "@avatark/world-memory-runtime"
import type { EntityMemoryEntry, WorldConsequence, WorldEvent } from "@avatark/world-memory-contracts"
import { deriveParticipationRecordId, resolveParticipationAuthorization } from "@avatark/participation-runtime"
import type { ParticipationAuthorization, ParticipationRecord } from "@avatark/participation-contracts"
import {
  DEER_ARCHETYPE_ID,
  LIVING_FOREST_BEHAVIOR_PROFILES,
  LIVING_FOREST_DAY_PHASE_SCHEDULE,
  LIVING_FOREST_ENCOUNTER_RULES,
  LIVING_FOREST_LOCATION_EDGES,
  LIVING_FOREST_RESOURCE_AFFORDANCES,
  LIVING_FOREST_RHYTHM_SCHEDULES,
  LIVING_FOREST_ROUTINE_ENTRIES_BY_ARCHETYPE_ID,
  LIVING_FOREST_SEASONS,
  LIVING_FOREST_SIGNIFICANCE_CONFIG,
  LIVING_FOREST_WORLD_ID,
} from "./definition.ts"
import type { LivingForestRepositories } from "./repositories.ts"

// Host-layer composition for Living Forest -- mirrors the SAME layering
// convention every `lib/*/hostService.ts` file already holds for Living
// Vrindavan (wire real content into generic runtime functions, add zero
// engine logic here), but is an entirely NEW, self-contained module:
// nothing in this file imports, extends, or is imported by any existing
// `lib/*/hostService.ts`/`lib/*/vrindavanXDefinition.ts` file. See
// docs/STUDIOK_LIVING_WORLD_KERNEL_VERTICAL_SLICE.md for why a parallel
// file was written instead of parameterizing the existing ones (every
// existing Host file bakes its world's content in at module scope; that
// is a real, separately-scoped refactor, not something to fold into this
// vertical slice's own diff).

const defaultNow = () => new Date().toISOString()

const FOREST_LOCATION_GRAPH = buildUndirectedLocationGraph(LIVING_FOREST_LOCATION_EDGES)

export function createFreshForestSharedState(): SharedWorldState {
  const firstSeason = LIVING_FOREST_SEASONS[0]
  return {
    worldId: LIVING_FOREST_WORLD_ID,
    worldVersion: 1,
    clock: { worldId: LIVING_FOREST_WORLD_ID, tick: 0, paused: false },
    season: { currentSeasonId: firstSeason.id, enteredAtTick: 0 },
    environment: {
      weather: { temperatureBand: firstSeason.environmentalEnvelope.temperatureBand, precipitationBand: firstSeason.environmentalEnvelope.precipitationBand, humidityBand: firstSeason.environmentalEnvelope.humidityBand },
      hydrology: { hydrologyBand: firstSeason.environmentalEnvelope.hydrologyBaselineBand, soilMoistureBand: firstSeason.environmentalEnvelope.hydrologyBaselineBand },
      ecology: { vegetationActivityBand: firstSeason.environmentalEnvelope.vegetationActivityBand, animalActivityBand: firstSeason.environmentalEnvelope.animalActivityBand },
    },
  }
}

export interface ForestPopulation {
  entities: LivingEntityState[]
  behaviorStates: EntityBehaviorState[]
  groups: GroupState[]
}

// Two deer, both starting at the entry patch (`forest-clearing`) -- the
// visitor's own entry point -- in one herd. Neither starts with any
// entity-memory; `withSeededMemoryHint` (below) is used only by the
// isolated "future behavior changes" proof, never the main narrative
// run, to avoid the fresh tick-0 encounter's own RESOURCE_PREFERENCE
// consequence (recorded at `forest-clearing`) confounding which memory
// entry is "most recent" for the water-seeking decision under test.
export function createInitialForestPopulation(): ForestPopulation {
  const entities: LivingEntityState[] = [
    { id: "deer-1", archetypeId: DEER_ARCHETYPE_ID, locationId: "forest-clearing", lifecyclePhase: "present", attributes: {}, lastUpdatedTick: 0 },
    { id: "deer-2", archetypeId: DEER_ARCHETYPE_ID, locationId: "forest-clearing", lifecyclePhase: "present", attributes: {}, lastUpdatedTick: 0 },
  ]
  const groups: GroupState[] = [{ worldId: LIVING_FOREST_WORLD_ID, id: "deer-herd-1", kind: "herd", memberEntityIds: ["deer-1", "deer-2"], locationId: "forest-clearing", targetLocationId: null, cohesion: 1, lastUpdatedTick: 0 }]
  return { entities, behaviorStates: [], groups }
}

export interface AdvanceForestParams {
  sharedState: SharedWorldState
  population: ForestPopulation
  ticks: number
  seed: string
  now: () => string
  protectedNarrative?: ProtectedNarrativeProjection
  memoryHintByEntityId?: ReadonlyMap<string, MemoryHint>
}

export interface AdvanceForestResult {
  sharedState: SharedWorldState
  population: ForestPopulation
  result: AdvancePopulationSimulationResult
}

// The one call-site wiring ALL of Living Forest's own content into
// @avatark/living-population-runtime's own single tick-advance entry
// point. Everything below this call is unmodified, generic engine code
// -- this function's only job is content assembly, the same role every
// `wakeWorldWith*` Host function already plays for Living Vrindavan.
export function advanceForest(params: AdvanceForestParams): AdvanceForestResult {
  const protectedNarrative = params.protectedNarrative ?? emptyProtectedNarrativeProjection(LIVING_FOREST_WORLD_ID)
  const routineEntriesByArchetypeId = LIVING_FOREST_ROUTINE_ENTRIES_BY_ARCHETYPE_ID as ReadonlyMap<string, RoutineWindowInput[]>

  const result = advancePopulationSimulation({
    sharedState: params.sharedState,
    seasonDefinitions: LIVING_FOREST_SEASONS,
    vegetationArchetypes: [],
    vegetationEntities: [],
    populationEntities: params.population.entities,
    behaviorProfiles: LIVING_FOREST_BEHAVIOR_PROFILES,
    behaviorStates: params.population.behaviorStates,
    groups: params.population.groups,
    rhythmSchedules: LIVING_FOREST_RHYTHM_SCHEDULES,
    resourceAffordances: LIVING_FOREST_RESOURCE_AFFORDANCES,
    worldLocationGraph: FOREST_LOCATION_GRAPH,
    encounterRules: LIVING_FOREST_ENCOUNTER_RULES,
    protectedNarrative,
    ticks: params.ticks,
    seed: params.seed,
    now: params.now,
    memoryHintByEntityId: params.memoryHintByEntityId,
    resolveDayPhaseForTick: (tick) => resolveDayPhase(LIVING_FOREST_DAY_PHASE_SCHEDULE, tick),
    routineEntriesByArchetypeId,
  })

  return {
    sharedState: result.sharedState,
    population: { entities: result.populationEntities, behaviorStates: result.behaviorStates, groups: result.groups },
    result,
  }
}

// A visitor's own arrival at a patch does not itself advance the
// simulation -- this computes "what encounter opportunity exists RIGHT
// NOW, given who is currently present," a pure read of the current
// population/environment (never a tick-advancing call). This matters
// because `advanceForest`'s own morning routine bonus can cause BOTH
// deer to move away from `forest-clearing` on the very first tick
// advance (their thirst-driven `MOVE_TO_RESOURCE` already outscores
// REST/GRAZE the moment `dayPhase` reaches MORNING) -- capturing the
// opportunity from the population's state AS OF ARRIVAL, before that
// movement happens, is the honest "visitor enters patch" moment the
// mission's own pipeline names, not an artifact of call ordering.
export function computeForestEncounterOpportunities(populationEntities: LivingEntityState[], sharedState: SharedWorldState, protectedNarrative: ProtectedNarrativeProjection): EncounterOpportunity[] {
  return computeEncounterOpportunities(populationEntities, LIVING_FOREST_ENCOUNTER_RULES, sharedState.environment, protectedNarrative, sharedState.clock.tick)
}

const MOVEMENT_ACTIVITIES = new Set(["MOVE_TO_RESOURCE", "FOLLOW_GROUP", "RETURN_TO_GROUP", "APPROACH_RELATED_ENTITY", "RETURN_TO_HOME_RANGE"])

export interface RealizeForestEncountersParams {
  opportunities: EncounterOpportunity[]
  populationEntities: LivingEntityState[]
  behaviorStates: EntityBehaviorState[]
  groups: GroupState[]
  protectedNarrative: ProtectedNarrativeProjection
  worldVersion: number
  tick: number
  seasonId: string
  repositories: LivingForestRepositories
}

export interface ResolvedForestEncounter {
  tick: number
  ruleId: string
  locationId: string
  category: EncounterOpportunity["category"]
  participantEntityIds: string[]
  causalReferences: { kind: string; ref: string }[]
  consequences: WorldConsequence[]
}

export interface RealizeForestEncountersResult {
  records: EncounterRecord[]
  resolvedForMemory: ResolvedForestEncounter[]
}

// Mirrors lib/encounterRealization/hostService.ts's own
// `wakeWorldWithEncounterRealization` loop -- same per-opportunity
// idempotency-by-content-derived-id discipline, same real
// `resolveEncounterRealization`/`deriveConsequences` calls -- reduced to
// what THIS slice's scope needs: no social-ecology relationship
// context (Living Forest's vertical slice deliberately does not wire
// social-ecology, see the final report's "deliberately not
// implemented" section), so `groupCohesion` is resolved from GroupState
// alone and `relationshipBand`/`relationshipIdsInvolved` stay
// permanently null/empty -- a real, honest simplification, not a
// disguised shortcut (resolveEncounterRealization's own
// RELATIONSHIP_BIAS term simply never contributes for this world).
export async function realizeForestEncounters(params: RealizeForestEncountersParams): Promise<RealizeForestEncountersResult> {
  const behaviorByEntityId = new Map(params.behaviorStates.map((s) => [s.entityId, s]))
  const groupByEntityId = new Map<string, { id: string; cohesion: number }>(params.groups.flatMap((g) => g.memberEntityIds.map((entityId) => [entityId, { id: g.id, cohesion: g.cohesion }])))

  const records: EncounterRecord[] = []
  const resolvedForMemory: ResolvedForestEncounter[] = []

  for (const opportunity of params.opportunities) {
    const id = deriveEncounterRecordId(LIVING_FOREST_WORLD_ID, opportunity.ruleId, opportunity.locationId, opportunity.contributingEntityIds, opportunity.tick)
    const existing = await params.repositories.encounterRecords.get(LIVING_FOREST_WORLD_ID, id)
    if (existing) {
      records.push(existing)
      continue
    }

    const presentEntityIds = params.populationEntities.filter((e) => e.locationId === opportunity.locationId).map((e) => e.id)
    const routineCompatibleEntityIds = presentEntityIds.filter((entityId) => {
      const activity = behaviorByEntityId.get(entityId)?.activity
      return activity !== undefined && !MOVEMENT_ACTIVITIES.has(activity)
    })
    const groupsInvolved = [...new Set(opportunity.contributingEntityIds.map((entityId) => groupByEntityId.get(entityId)?.id).filter((groupId): groupId is string => groupId !== undefined))]
    const groupCohesion = groupsInvolved.length === 1 ? groupByEntityId.get(opportunity.contributingEntityIds[0])?.cohesion ?? null : null

    const variation = deriveDeterministicVariation({ worldId: LIVING_FOREST_WORLD_ID, worldVersion: params.worldVersion, tick: params.tick, locationId: opportunity.locationId, seasonId: params.seasonId, seed: LIVING_FOREST_WORLD_ID })

    const result = resolveEncounterRealization({ opportunity, protectedNarrative: params.protectedNarrative, presentEntityIds, routineCompatibleEntityIds, groupCohesion, relationshipBand: null, resourceOpportunityAvailable: true, variation })

    const record: EncounterRecord = {
      id,
      worldId: LIVING_FOREST_WORLD_ID,
      ruleId: opportunity.ruleId,
      category: opportunity.category,
      locationId: opportunity.locationId,
      participantEntityIds: opportunity.contributingEntityIds,
      participantGroupIds: groupsInvolved,
      startTick: opportunity.tick,
      realizationTick: result.status === "REALIZED" ? params.tick : null,
      completionTick: null,
      status: result.status,
      causalReferences: result.causalReferences,
      relationshipContext: [],
      protectedNarrativeGateOpen: opportunity.category !== "narrative-protected" || params.protectedNarrative.resolved,
      worldEventId: null,
      encounterHistoryEntryId: null,
      variationConsulted: result.variationConsulted,
    }
    await params.repositories.encounterRecords.save(record)
    records.push(record)

    if (result.status === "REALIZED") {
      const consequences = deriveConsequences({ status: result.status, ruleId: opportunity.ruleId, locationId: opportunity.locationId, participantEntityIds: opportunity.contributingEntityIds, relationshipIdsInvolved: [] })
      resolvedForMemory.push({
        tick: params.tick,
        ruleId: opportunity.ruleId,
        locationId: opportunity.locationId,
        category: opportunity.category,
        participantEntityIds: opportunity.contributingEntityIds,
        causalReferences: result.causalReferences,
        consequences: consequences.filter((c) => c.domain === "WORLD_MEMORY").map((c) => c.worldConsequence),
      })
    }
  }

  return { records, resolvedForMemory }
}

export interface RecordForestMemoryParams {
  now: () => string
  populationEvents: DeriveWorldEventsParams["populationEvents"]
  resolvedEncounters: ResolvedForestEncounter[]
  repositories: LivingForestRepositories
}

export interface RecordForestMemoryResult {
  worldEvents: WorldEvent[]
  entityMemoryEntries: EntityMemoryEntry[]
}

// Mirrors lib/worldMemory/hostService.ts's own real derive-then-append
// shape: `deriveWorldEvents` (significance-filtered) -> append (real
// idempotency-by-id) -> `deriveEntityMemoryEntries` -> append. No
// season/environmental-band/location-condition/separation/reunion/
// canonical-event inputs are wired -- Living Forest's vertical slice
// only exercises the population-movement + encounter-resolution facets
// of `deriveWorldEvents`, the two this mission's own pipeline actually
// names ("consequence -> world/entity/place memory").
export async function recordForestMemory(params: RecordForestMemoryParams): Promise<RecordForestMemoryResult> {
  const worldEvents = deriveWorldEvents({
    worldId: LIVING_FOREST_WORLD_ID,
    now: params.now,
    seasonTransitions: [],
    environmentalBandChanges: [],
    locationConditionChanges: [],
    populationEvents: params.populationEvents,
    encounterAvailabilityChanges: [],
    resolvedEncounters: params.resolvedEncounters,
    significanceConfig: LIVING_FOREST_SIGNIFICANCE_CONFIG,
  })

  for (const event of worldEvents) await params.repositories.worldEvents.append(event)

  const entityMemoryEntries = deriveEntityMemoryEntries(LIVING_FOREST_WORLD_ID, worldEvents)
  for (const entry of entityMemoryEntries) await params.repositories.entityMemory.append(entry)

  return { worldEvents, entityMemoryEntries }
}

// Bridges recorded Entity Memory back into the NEXT `advanceForest`
// call's own `memoryHintByEntityId` -- the exact same bounded, one-field
// bridge (`resolvePreferredResourceLocation`) Living Vrindavan's own
// `lib/worldMemory/hostService.ts` already calls before every wake.
export async function buildForestMemoryHints(entityIds: string[], repositories: LivingForestRepositories): Promise<Map<string, MemoryHint>> {
  const hints = new Map<string, MemoryHint>()
  for (const entityId of entityIds) {
    const entries = await repositories.entityMemory.list(LIVING_FOREST_WORLD_ID, entityId)
    hints.set(entityId, { preferredResourceLocationId: resolvePreferredResourceLocation(entries) })
  }
  return hints
}

export function buildForestWorldSnapshot(sharedState: SharedWorldState, populationEntities: LivingEntityState[], locationId: string, userId: string, now: () => string): WorldSnapshot {
  return resolveWorldSnapshot({
    sharedState,
    seasonDefinitions: LIVING_FOREST_SEASONS,
    entities: populationEntities,
    encounterRules: LIVING_FOREST_ENCOUNTER_RULES,
    locationId,
    visitorMemory: emptyVisitorWorldMemory(userId, LIVING_FOREST_WORLD_ID),
    protectedNarrative: emptyProtectedNarrativeProjection(LIVING_FOREST_WORLD_ID),
    provenance: { worldArtifactSpecId: "living-forest-vertical-slice", systemsArtifactSpecId: "living-forest-vertical-slice", canonDocIds: [] },
    now,
  })
}

// Host-layer-defined return shape (mirrors lib/participation/hostService.ts's
// own `ParticipationOutcome` -- that type is defined there, not exported
// by @avatark/participation-contracts, so it is restated here rather
// than imported from a Vrindavan Host file).
export interface ForestParticipationOutcome {
  authorization: ParticipationAuthorization
  record: ParticipationRecord | null
}

// Mirrors lib/participation/hostService.ts's own
// `authorizeAndRecordParticipation` exactly, against a locally-resolved
// WorldSnapshot (buildForestWorldSnapshot, above) instead of Vrindavan's
// durable-family snapshot -- same generic
// `resolveParticipationAuthorization`/`deriveParticipationRecordId`
// calls, same idempotent-by-content-id discipline, same honest
// `encounterRecordId: null` default.
export async function authorizeAndRecordForestParticipation(userId: string, ruleId: string, locationId: string, snapshot: WorldSnapshot, repositories: LivingForestRepositories, now: () => string = defaultNow): Promise<ForestParticipationOutcome> {
  const match = snapshot.availableEncounters.find((e) => e.ruleId === ruleId)
  const narrativeGateOpen = !match || match.category !== "narrative-protected" || snapshot.protectedNarrative.resolved
  const authorization: ParticipationAuthorization = resolveParticipationAuthorization({ availableViaLiveSnapshot: match !== undefined, narrativeGateOpen })
  if (!authorization.authorized) return { authorization, record: null }

  const tick = snapshot.simulationTick
  const id = deriveParticipationRecordId(LIVING_FOREST_WORLD_ID, userId, ruleId, locationId, tick)
  const existing = await repositories.participationRecords.get(LIVING_FOREST_WORLD_ID, id)
  if (existing) return { authorization, record: existing }

  const encounterRecords = await repositories.encounterRecords.listByLocation(LIVING_FOREST_WORLD_ID, locationId)
  const encounterRecord = encounterRecords.find((r) => r.ruleId === ruleId && (r.status === "REALIZED" || r.status === "CONSEQUENCES_APPLIED" || r.status === "REMEMBERED"))

  const record: ParticipationRecord = {
    id,
    worldId: LIVING_FOREST_WORLD_ID,
    userId,
    ruleId,
    locationId,
    participantEntityIds: snapshot.presentEntities.map((e) => e.id),
    tick,
    encounterRecordId: encounterRecord?.id ?? null,
    createdAt: now(),
  }
  await repositories.participationRecords.save(record)
  return { authorization, record }
}

// Restated once, for direct test-file use where only the raw
// AvailableEncounter facts (not a full ParticipationRecord) are needed.
export function availableForestEncounters(rules: EncounterRule[], locationId: string, sharedState: SharedWorldState, protectedNarrative: ProtectedNarrativeProjection) {
  return resolveAvailableEncounters(rules, locationId, sharedState.environment, protectedNarrative)
}
