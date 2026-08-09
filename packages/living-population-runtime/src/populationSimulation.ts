import { advanceWorldSimulation, resolveAvailableEncounters } from "@avatark/living-systems-runtime"
import type { EncounterRule, EntityArchetype, EnvironmentalState, LivingEntityState, ProtectedNarrativeProjection, SeasonDefinition, SharedWorldState, WorldSystemEvent } from "@avatark/living-systems-contracts"
import type {
  BehaviorType,
  EntityBehaviorProfile,
  EntityBehaviorState,
  EncounterOpportunity,
  GroupState,
  LocationResourceAffordance,
  MovementIntent,
  PopulationEvent,
  RhythmSchedule,
  WorldLocationGraph,
} from "@avatark/living-population-contracts"
import { freshNeedStates } from "@avatark/living-population-contracts"
import type { NeedDimension } from "@avatark/living-population-contracts"
import type { MemoryHint, SocialContext } from "./behaviorSelection.ts"
import { resolveRhythmPhase } from "./rhythm.ts"
import { resolvePerception } from "./perception.ts"
import { selectBehavior } from "./behaviorSelection.ts"
import { resolveMovementIntent } from "./movementResolution.ts"
import { advanceGroupState } from "./groupDynamics.ts"
import { evolveNeeds } from "./needsEvolution.ts"

// Sprint 10, Phase 6/10: a BehaviorType maps to a COARSE lifecycle label
// written into the population entity's own LivingEntityState.lifecyclePhase
// -- reusing Phase 10's own suggested vocabulary, derived every tick from
// the behavior actually selected (never a season-label swap; see Phase
// 9's own requirement). This is the ONLY place anything writes to a
// population entity's lifecyclePhase -- never advanceEntityLifecycle,
// which this roster is never passed through.
const COARSE_LIFECYCLE: Record<BehaviorType, string> = {
  REST: "RESTING",
  GRAZE: "ACTIVE",
  DRINK: "ACTIVE",
  SOCIALIZE: "ACTIVE",
  MOVE_TO_RESOURCE: "MOVING",
  FOLLOW_GROUP: "MOVING",
  RETURN_TO_GROUP: "MOVING",
  APPROACH_RELATED_ENTITY: "MOVING",
  RETURN_TO_HOME_RANGE: "MOVING",
  REMAIN: "DORMANT",
}

const NEED_SATISFIED_BY: Partial<Record<BehaviorType, NeedDimension>> = { GRAZE: "hunger", DRINK: "thirst", REST: "rest", SOCIALIZE: "social" }

export interface AdvancePopulationSimulationParams {
  sharedState: SharedWorldState
  seasonDefinitions: SeasonDefinition[]
  vegetationArchetypes: EntityArchetype[]
  vegetationEntities: LivingEntityState[]
  populationEntities: LivingEntityState[]
  behaviorProfiles: EntityBehaviorProfile[]
  behaviorStates: EntityBehaviorState[]
  groups: GroupState[]
  rhythmSchedules: RhythmSchedule[]
  resourceAffordances: LocationResourceAffordance[]
  worldLocationGraph: WorldLocationGraph
  encounterRules: EncounterRule[]
  protectedNarrative: ProtectedNarrativeProjection
  ticks: number
  seed: string
  now: () => string
  // Sprint 11, Phase 7: bounded, deterministic entity-memory influence on
  // behavior selection -- absent (or missing an entry) for any entity
  // with no relevant memory, producing identical behavior to Sprint 10's
  // own unmodified selectBehavior. Population never reads memory
  // storage itself; the Host layer resolves this map before calling in.
  memoryHintByEntityId?: ReadonlyMap<string, MemoryHint>
  // Sprint 12, Phase 9: static SOCIAL STRUCTURE inputs -- who is related
  // to whom, and each owner's own preferred locations. Recomputed into
  // a fresh, tick-current SocialContext INSIDE the loop below (unlike
  // memoryHintByEntityId, which is resolved once before the whole call
  // -- social context depends on other entities' CURRENT locations,
  // which change every tick, so it cannot be precomputed the same way).
  relatedEntityIdsByEntityId?: ReadonlyMap<string, string[]>
  homeRangeLocationIdsByOwnerId?: ReadonlyMap<string, string[]>
}

export interface AdvancePopulationSimulationResult {
  sharedState: SharedWorldState
  vegetationEntities: LivingEntityState[]
  populationEntities: LivingEntityState[]
  behaviorStates: EntityBehaviorState[]
  groups: GroupState[]
  worldSystemEvents: WorldSystemEvent[]
  encounterOpportunities: EncounterOpportunity[]
  // Sprint 11: structured per-tick deltas -- additive, see
  // populationEvent.ts's own header comment for why this is an extension
  // of Sprint 10's engine, never a second one.
  populationEvents: PopulationEvent[]
}

export function computeEncounterOpportunities(populationEntities: LivingEntityState[], encounterRules: EncounterRule[], environment: EnvironmentalState, protectedNarrative: ProtectedNarrativeProjection, tick: number): EncounterOpportunity[] {
  const locationIds = [...new Set(populationEntities.map((e) => e.locationId))]
  return locationIds.flatMap((locationId) => {
    const available = resolveAvailableEncounters(encounterRules, locationId, environment, protectedNarrative)
    const contributingEntityIds = populationEntities.filter((e) => e.locationId === locationId).map((e) => e.id)
    return available.map((encounter) => ({ ruleId: encounter.ruleId, locationId, category: encounter.category, contributingEntityIds, tick }))
  })
}

function seedBehaviorState(worldId: string, entity: LivingEntityState, profile: EntityBehaviorProfile, groupId: string | null, tick: number): EntityBehaviorState {
  return { worldId, entityId: entity.id, needs: freshNeedStates(profile.needDefinitions), rhythmPhase: "WAKE", activity: "REMAIN", movementType: "Remain", movementTargetLocationId: null, groupId, lastUpdatedTick: tick }
}

// Sprint 10, Phase 9/12: the single tick-advance entry point for the
// population/behavior domain -- composes Sprint 7's own
// advanceWorldSimulation UNMODIFIED, once per logical tick (never once
// for the whole batch), so every population decision this tick sees that
// EXACT tick's real environment. This is what makes catch-up
// (N ticks in one call) and active simulation (N calls of one tick)
// produce identical results here too, the same equivalence Sprint 9
// already proved for the causal engine alone.
export function advancePopulationSimulation(params: AdvancePopulationSimulationParams): AdvancePopulationSimulationResult {
  let sharedState = params.sharedState
  let vegetationEntities = params.vegetationEntities
  let populationEntities = params.populationEntities
  let behaviorStates = params.behaviorStates
  let groups = params.groups
  const worldSystemEvents: WorldSystemEvent[] = []
  const populationEvents: PopulationEvent[] = []
  const memoryHintByEntityId = params.memoryHintByEntityId ?? new Map<string, MemoryHint>()
  const relatedEntityIdsByEntityId = params.relatedEntityIdsByEntityId ?? new Map<string, string[]>()
  const homeRangeLocationIdsByOwnerId = params.homeRangeLocationIdsByOwnerId ?? new Map<string, string[]>()

  const profileByArchetype = new Map(params.behaviorProfiles.map((p) => [p.archetypeId, p]))
  const scheduleById = new Map(params.rhythmSchedules.map((s) => [s.id, s]))

  for (let step = 0; step < params.ticks; step++) {
    const worldStep = advanceWorldSimulation({
      sharedState,
      seasonDefinitions: params.seasonDefinitions,
      entityArchetypes: params.vegetationArchetypes,
      entities: vegetationEntities,
      ticks: 1,
      seed: params.seed,
      now: params.now,
    })
    sharedState = worldStep.sharedState
    vegetationEntities = worldStep.entities
    worldSystemEvents.push(...worldStep.events)
    const tick = sharedState.clock.tick

    const behaviorStateByEntityId = new Map(behaviorStates.map((s) => [s.entityId, s]))
    const groupsByEntityId = new Map<string, string>()
    for (const group of groups) for (const memberId of group.memberEntityIds) groupsByEntityId.set(memberId, group.id)

    const movementIntentsByEntityId = new Map<string, MovementIntent>()
    const nextPopulationEntities: LivingEntityState[] = []
    const nextBehaviorStates: EntityBehaviorState[] = []

    for (const entity of populationEntities) {
      const profile = profileByArchetype.get(entity.archetypeId)
      if (!profile) {
        nextPopulationEntities.push(entity)
        continue
      }
      const schedule = scheduleById.get(profile.rhythmScheduleId)
      if (!schedule) throw new RangeError(`no rhythm schedule registered for id referenced by archetype "${entity.archetypeId}"`)

      const current = behaviorStateByEntityId.get(entity.id) ?? seedBehaviorState(sharedState.worldId, entity, profile, groupsByEntityId.get(entity.id) ?? null, tick)
      const rhythmPhase = resolveRhythmPhase(schedule, tick)
      const perception = resolvePerception({
        entity,
        worldLocationGraph: params.worldLocationGraph,
        resourceAffordances: params.resourceAffordances,
        environment: sharedState.environment,
        allEntities: populationEntities,
        groupsByEntityId,
        encounterRules: params.encounterRules,
        protectedNarrative: params.protectedNarrative,
      })
      const group = perception.groupId ? groups.find((g) => g.id === perception.groupId) ?? null : null
      const groupInfo = group ? { locationId: group.locationId, targetLocationId: group.targetLocationId } : null

      const relatedIds = relatedEntityIdsByEntityId.get(entity.id) ?? []
      const relatedEntityLocationId = relatedIds.map((id) => populationEntities.find((e) => e.id === id)?.locationId).find((locationId): locationId is string => Boolean(locationId) && locationId !== entity.locationId) ?? null
      const homeRangeLocationIds = homeRangeLocationIdsByOwnerId.get(entity.id) ?? (perception.groupId ? homeRangeLocationIdsByOwnerId.get(perception.groupId) ?? [] : [])
      const socialContext: SocialContext = {
        relatedEntityLocationId,
        homeRangeLocationIds,
        withinHomeRange: homeRangeLocationIds.length === 0 || homeRangeLocationIds.includes(entity.locationId),
      }

      const behaviorIntent = selectBehavior({ entityId: entity.id, profile, needs: current.needs, rhythmPhase, perception, group: groupInfo, tick, memoryHint: memoryHintByEntityId.get(entity.id) ?? null, socialContext })
      const movementIntent = resolveMovementIntent(behaviorIntent, perception)
      movementIntentsByEntityId.set(entity.id, movementIntent)

      if (behaviorIntent.type !== current.activity) {
        populationEvents.push({ type: "entity.activity_transitioned", tick, entityId: entity.id, groupId: perception.groupId, fromLocationId: null, toLocationId: null, fromActivity: current.activity, toActivity: behaviorIntent.type })
      }

      const satisfiedDimension = NEED_SATISFIED_BY[behaviorIntent.type]
      const evolvedNeeds = evolveNeeds({
        needs: current.needs,
        definitions: profile.needDefinitions,
        environment: sharedState.environment,
        satisfiedDimensions: satisfiedDimension ? [satisfiedDimension] : [],
      })

      const newLocationId = movementIntent.type === "Remain" ? entity.locationId : movementIntent.targetLocationId ?? entity.locationId

      if (newLocationId !== entity.locationId) {
        populationEvents.push({ type: "entity.moved", tick, entityId: entity.id, groupId: perception.groupId, fromLocationId: entity.locationId, toLocationId: newLocationId, fromActivity: null, toActivity: null })
      }

      nextPopulationEntities.push({ ...entity, locationId: newLocationId, lifecyclePhase: COARSE_LIFECYCLE[behaviorIntent.type], lastUpdatedTick: tick })
      nextBehaviorStates.push({
        worldId: sharedState.worldId,
        entityId: entity.id,
        needs: evolvedNeeds,
        rhythmPhase,
        activity: behaviorIntent.type,
        movementType: movementIntent.type,
        movementTargetLocationId: movementIntent.targetLocationId,
        groupId: perception.groupId,
        lastUpdatedTick: tick,
      })
    }

    populationEntities = nextPopulationEntities
    behaviorStates = nextBehaviorStates
    groups = groups.map((group) => {
      const advanced = advanceGroupState({
        group,
        memberEntities: populationEntities.filter((e) => group.memberEntityIds.includes(e.id)),
        memberMovementIntents: group.memberEntityIds.map((id) => movementIntentsByEntityId.get(id)).filter((intent): intent is MovementIntent => Boolean(intent)),
        tick,
      })
      if (advanced.locationId !== group.locationId) {
        populationEvents.push({ type: "group.relocated", tick, entityId: null, groupId: group.id, fromLocationId: group.locationId, toLocationId: advanced.locationId, fromActivity: null, toActivity: null })
      }
      return advanced
    })
  }

  const encounterOpportunities = computeEncounterOpportunities(populationEntities, params.encounterRules, sharedState.environment, params.protectedNarrative, sharedState.clock.tick)

  return { sharedState, vegetationEntities, populationEntities, behaviorStates, groups, worldSystemEvents, encounterOpportunities, populationEvents }
}
