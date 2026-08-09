import { advancePopulationSimulation, computeEncounterOpportunities, resolvePopulationSnapshot } from "@avatark/living-population-runtime"
import type { AdvancePopulationSimulationResult, DayPhaseInput, MemoryHint, RoutineWindowInput } from "@avatark/living-population-runtime"
import { freshNeedStates } from "@avatark/living-population-contracts"
import type { PopulationSnapshot } from "@avatark/living-population-contracts"
import type { SharedWorldState } from "@avatark/living-systems-contracts"
import type { WorldInstanceId, WorldOwnerId } from "@avatark/world-persistence-contracts"
import { LIVING_VRINDAVAN_ENCOUNTER_RULES, LIVING_VRINDAVAN_SEASONS } from "../livingSystems/systemsDefinition.ts"
import { protectedNarrativeStateRepository } from "../livingSystems/singleton.ts"
import { catchUpCausalEnvironment, getWorldState } from "../worldPersistence/hostService.ts"
import type { CausalEnvironmentCatchUpResult } from "../worldPersistence/hostService.ts"
import type { WorldEmbodimentSnapshot } from "@avatark/world-embodiment-contracts"
import { translateGroupIntentToUnrealCommands } from "@avatark/world-embodiment-runtime"
import type { UnrealCommand } from "@avatark/world-embodiment-contracts"
import { resolveDurableWorldEmbodimentSnapshot } from "../worldPersistence/durableSnapshot.ts"
import { entityBehaviorStateRepository, groupStateRepository, populationEntityStateRepository } from "./singleton.ts"
import { buildGroupIntentInputs, buildPopulationEntityPresentationsByLocation } from "./embodimentBridge.ts"
import {
  VRINDAVAN_BEHAVIOR_PROFILES,
  VRINDAVAN_LOCATION_GRAPH,
  VRINDAVAN_POPULATION_ARCHETYPE_NAMES,
  VRINDAVAN_RESOURCE_AFFORDANCES,
  VRINDAVAN_RHYTHM_SCHEDULES,
  initialVrindavanGroups,
  initialVrindavanPopulationEntities,
} from "./vrindavanPopulationDefinition.ts"

// Sprint 10, Phase 11/12: the Host's population-domain read/advance
// surface -- additive alongside lib/worldPersistence/hostService.ts,
// never modifying it. SharedWorldState remains EXCLUSIVELY owned and
// persisted by that module's own wakeWorld/advanceWorld -- this file
// never calls durableWorldStateRepository.conditionalSave, and reads
// SharedWorldState only to drive population's own, separately-persisted
// entities/behavior/groups (invariant #1/#2: no competing shared-world
// authority).
async function ensureSeeded(worldInstanceId: WorldInstanceId): Promise<void> {
  const existing = await populationEntityStateRepository.list(worldInstanceId)
  if (existing.length > 0) return

  const profileByArchetype = new Map(VRINDAVAN_BEHAVIOR_PROFILES.map((p) => [p.archetypeId, p]))
  const groups = initialVrindavanGroups(worldInstanceId)
  const groupIdByEntity = new Map(groups.flatMap((group) => group.memberEntityIds.map((entityId) => [entityId, group.id])))

  for (const entity of initialVrindavanPopulationEntities(worldInstanceId)) {
    await populationEntityStateRepository.save(worldInstanceId, entity)
    const profile = profileByArchetype.get(entity.archetypeId)
    if (!profile) continue
    await entityBehaviorStateRepository.save({
      worldId: worldInstanceId,
      entityId: entity.id,
      needs: freshNeedStates(profile.needDefinitions),
      rhythmPhase: "WAKE",
      activity: "REMAIN",
      movementType: "Remain",
      movementTargetLocationId: null,
      groupId: groupIdByEntity.get(entity.id) ?? null,
      lastUpdatedTick: 0,
    })
  }
  for (const group of groups) {
    await groupStateRepository.save(group)
  }
}

export async function getPopulationSnapshot(worldInstanceId: WorldInstanceId, now: () => string = () => new Date().toISOString()): Promise<PopulationSnapshot> {
  await ensureSeeded(worldInstanceId)
  const state = await getWorldState(worldInstanceId, now)
  const entities = await populationEntityStateRepository.list(worldInstanceId)
  const behaviorStates = await entityBehaviorStateRepository.list(worldInstanceId)
  const groups = await groupStateRepository.list(worldInstanceId)
  const protectedNarrative = await protectedNarrativeStateRepository.get(worldInstanceId)
  const opportunities = computeEncounterOpportunities(entities, LIVING_VRINDAVAN_ENCOUNTER_RULES, state.sharedState.environment, protectedNarrative, state.sharedState.clock.tick)
  return resolvePopulationSnapshot(worldInstanceId, state.sharedState.clock.tick, entities, behaviorStates, groups, opportunities)
}

// Sprint 10, Phase 12: advances population state for EXACTLY the ticks
// a caller specifies, starting from a caller-supplied SharedWorldState
// -- never independently deciding how many ticks to advance, and never
// persisting SharedWorldState itself. `seed` should always be the same
// value Sprint 9's own wakeWorld/advanceWorld used for this
// worldInstanceId (its own convention: the worldInstanceId itself) --
// see wakeWorldWithPopulation below for the one call site that gets
// this right end to end.
export async function advancePopulationForWorld(worldInstanceId: WorldInstanceId, sharedStateAtStart: SharedWorldState, ticks: number, seed: string, now: () => string, memoryHintByEntityId?: ReadonlyMap<string, MemoryHint>, relatedEntityIdsByEntityId?: ReadonlyMap<string, string[]>, homeRangeLocationIdsByOwnerId?: ReadonlyMap<string, string[]>, resolveDayPhaseForTick?: (tick: number) => DayPhaseInput | null, routineEntriesByArchetypeId?: ReadonlyMap<string, RoutineWindowInput[]>): Promise<AdvancePopulationSimulationResult> {
  await ensureSeeded(worldInstanceId)

  const populationEntities = await populationEntityStateRepository.list(worldInstanceId)
  const behaviorStates = await entityBehaviorStateRepository.list(worldInstanceId)
  const groups = await groupStateRepository.list(worldInstanceId)
  const protectedNarrative = await protectedNarrativeStateRepository.get(worldInstanceId)

  const result = advancePopulationSimulation({
    sharedState: sharedStateAtStart,
    seasonDefinitions: LIVING_VRINDAVAN_SEASONS,
    vegetationArchetypes: [],
    vegetationEntities: [],
    populationEntities,
    behaviorProfiles: VRINDAVAN_BEHAVIOR_PROFILES,
    behaviorStates,
    groups,
    rhythmSchedules: VRINDAVAN_RHYTHM_SCHEDULES,
    resourceAffordances: VRINDAVAN_RESOURCE_AFFORDANCES,
    worldLocationGraph: VRINDAVAN_LOCATION_GRAPH,
    encounterRules: LIVING_VRINDAVAN_ENCOUNTER_RULES,
    protectedNarrative,
    ticks,
    seed,
    now,
    memoryHintByEntityId,
    relatedEntityIdsByEntityId,
    homeRangeLocationIdsByOwnerId,
    resolveDayPhaseForTick,
    routineEntriesByArchetypeId,
  })

  for (const entity of result.populationEntities) await populationEntityStateRepository.save(worldInstanceId, entity)
  for (const state of result.behaviorStates) await entityBehaviorStateRepository.save(state)
  for (const group of result.groups) await groupStateRepository.save(group)

  return result
}

export interface WakeWorldWithPopulationResult {
  world: CausalEnvironmentCatchUpResult
  population: AdvancePopulationSimulationResult
}

// Sprint 10, Phase 12: the one place BOTH Sprint 9's world catch-up and
// Sprint 10's population catch-up are driven by the SAME tick count, so
// "visitor leaves -> world unobserved -> logical time advances ->
// environment changes -> entity needs/rhythms evolve -> entities change
// activity/location -> visitor returns -> population reflects elapsed
// world time" holds end to end. Reads the PRE-wake SharedWorldState
// first specifically so population's own internal tick-by-tick replay
// starts from the exact same point Sprint 9's own environment catch-up
// did -- determinism guarantees both reach the identical environment
// sequence.
//
// Sprint 17: calls `catchUpCausalEnvironment`, NOT `wakeWorld` -- the
// lifecycle commit (lastActiveAt/lastCheckpointTick) is deliberately
// deferred to the composed chain's own outermost layer
// (wakeWorldWithSpatialEcology's `commitWakeCompletion` call), so a
// crash anywhere between here and there leaves this wake attempt's own
// catch-up window recoverable on retry rather than silently skipped.
export async function wakeWorldWithPopulation(worldInstanceId: WorldInstanceId, ownerId: WorldOwnerId, now: () => string = () => new Date().toISOString(), memoryHintByEntityId?: ReadonlyMap<string, MemoryHint>, relatedEntityIdsByEntityId?: ReadonlyMap<string, string[]>, homeRangeLocationIdsByOwnerId?: ReadonlyMap<string, string[]>, resolveDayPhaseForTick?: (tick: number) => DayPhaseInput | null, routineEntriesByArchetypeId?: ReadonlyMap<string, RoutineWindowInput[]>): Promise<WakeWorldWithPopulationResult> {
  const stateBeforeWake = await getWorldState(worldInstanceId, now)
  const world = await catchUpCausalEnvironment(worldInstanceId, ownerId, now)
  const population = await advancePopulationForWorld(worldInstanceId, stateBeforeWake.sharedState, world.ticksApplied, worldInstanceId, now, memoryHintByEntityId, relatedEntityIdsByEntityId, homeRangeLocationIdsByOwnerId, resolveDayPhaseForTick, routineEntriesByArchetypeId)
  return { world, population }
}

// Sprint 10, Phase 15: extends Sprint 9's own durable WorldEmbodimentSnapshot
// resolution with population entity presentations, via the one optional,
// additive param resolveDurableWorldEmbodimentSnapshot now accepts.
// Living Systems' own vegetation-roster entities and Sprint 10's
// population-roster entities appear side by side in the SAME region,
// each carrying only the fields their own domain actually has.
export async function getPopulationEmbodimentSnapshot(worldInstanceId: WorldInstanceId, userId: string, locationId: string, reachableLocationIds: string[], now: () => string = () => new Date().toISOString()): Promise<WorldEmbodimentSnapshot> {
  await ensureSeeded(worldInstanceId)
  const entities = await populationEntityStateRepository.list(worldInstanceId)
  const behaviorStates = await entityBehaviorStateRepository.list(worldInstanceId)
  const behaviorStatesByEntityId = new Map(behaviorStates.map((s) => [s.entityId, s]))
  const additionalEntityPresentationsByLocation = buildPopulationEntityPresentationsByLocation(entities, behaviorStatesByEntityId, VRINDAVAN_POPULATION_ARCHETYPE_NAMES)

  return resolveDurableWorldEmbodimentSnapshot({ worldInstanceId, userId, locationId, reachableLocationIds, now, additionalEntityPresentationsByLocation })
}

// Sprint 10, Phase 17: the headless Unreal-compatible view of population
// state -- group-level SetGroupIntent commands, via the exact same
// translator function the Web adapter's own entity/environment commands
// already go through.
export async function getPopulationGroupUnrealCommands(worldInstanceId: WorldInstanceId): Promise<UnrealCommand[]> {
  const groups = await groupStateRepository.list(worldInstanceId)
  return translateGroupIntentToUnrealCommands(buildGroupIntentInputs(groups))
}
