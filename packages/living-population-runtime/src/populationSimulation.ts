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
  RhythmSchedule,
  WorldLocationGraph,
} from "@avatark/living-population-contracts"
import { freshNeedStates } from "@avatark/living-population-contracts"
import type { NeedDimension } from "@avatark/living-population-contracts"
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
}

export interface AdvancePopulationSimulationResult {
  sharedState: SharedWorldState
  vegetationEntities: LivingEntityState[]
  populationEntities: LivingEntityState[]
  behaviorStates: EntityBehaviorState[]
  groups: GroupState[]
  worldSystemEvents: WorldSystemEvent[]
  encounterOpportunities: EncounterOpportunity[]
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

      const behaviorIntent = selectBehavior({ entityId: entity.id, profile, needs: current.needs, rhythmPhase, perception, group: groupInfo, tick })
      const movementIntent = resolveMovementIntent(behaviorIntent, perception)
      movementIntentsByEntityId.set(entity.id, movementIntent)

      const satisfiedDimension = NEED_SATISFIED_BY[behaviorIntent.type]
      const evolvedNeeds = evolveNeeds({
        needs: current.needs,
        definitions: profile.needDefinitions,
        environment: sharedState.environment,
        satisfiedDimensions: satisfiedDimension ? [satisfiedDimension] : [],
      })

      const newLocationId = movementIntent.type === "Remain" ? entity.locationId : movementIntent.targetLocationId ?? entity.locationId

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
    groups = groups.map((group) =>
      advanceGroupState({
        group,
        memberEntities: populationEntities.filter((e) => group.memberEntityIds.includes(e.id)),
        memberMovementIntents: group.memberEntityIds.map((id) => movementIntentsByEntityId.get(id)).filter((intent): intent is MovementIntent => Boolean(intent)),
        tick,
      }),
    )
  }

  const encounterOpportunities = computeEncounterOpportunities(populationEntities, params.encounterRules, sharedState.environment, params.protectedNarrative, sharedState.clock.tick)

  return { sharedState, vegetationEntities, populationEntities, behaviorStates, groups, worldSystemEvents, encounterOpportunities }
}
