import { deriveDeterministicVariation } from "@avatark/living-systems-contracts"
import type { EntityArchetype, LivingEntityState, SeasonDefinition, SharedWorldState, WorldSystemEvent } from "@avatark/living-systems-contracts"
import { advanceEntityLifecycle } from "./entityLifecycle.ts"
import { deriveEcology, deriveHydrology, deriveWeather } from "./causalEnvironment.ts"
import { findSeasonDefinition, resolveSeasonTransition } from "./seasonTransition.ts"
import { advanceClock } from "./worldClock.ts"

export interface AdvanceWorldSimulationParams {
  sharedState: SharedWorldState
  seasonDefinitions: SeasonDefinition[]
  entityArchetypes: EntityArchetype[]
  entities: LivingEntityState[]
  ticks: number
  seed: string
  now: () => string
}

export interface AdvanceWorldSimulationResult {
  sharedState: SharedWorldState
  entities: LivingEntityState[]
  events: WorldSystemEvent[]
}

// Sprint 7's single tick-advance entry point -- SHARED WORLD STATE and
// PERSISTENT ENTITY STATE both advance here, together, one logical tick
// at a time, so a season transition and the entities it affects always
// stay consistent with each other. Deterministic: identical inputs (same
// starting sharedState/entities, same ticks, same seed) always produce
// identical outputs -- proven by this package's own replay test.
export function advanceWorldSimulation(params: AdvanceWorldSimulationParams): AdvanceWorldSimulationResult {
  let sharedState = params.sharedState
  let entities = params.entities
  const events: WorldSystemEvent[] = []

  for (let step = 0; step < params.ticks; step++) {
    const clock = advanceClock(sharedState.clock, 1)
    const seasonBefore = sharedState.season.currentSeasonId
    const season = resolveSeasonTransition(sharedState.season, params.seasonDefinitions, clock)
    const seasonDefinition = findSeasonDefinition(params.seasonDefinitions, season.currentSeasonId)

    const weather = deriveWeather(seasonDefinition.environmentalEnvelope)
    const hydrology = deriveHydrology(weather, sharedState.environment.hydrology, seasonDefinition.environmentalEnvelope)
    const ecology = deriveEcology(hydrology, seasonDefinition.environmentalEnvelope, weather)

    sharedState = { ...sharedState, clock, season, environment: { weather, hydrology, ecology } }

    if (season.currentSeasonId !== seasonBefore) {
      events.push({
        type: "season.transitioned",
        worldId: sharedState.worldId,
        tick: clock.tick,
        detail: { from: seasonBefore, to: season.currentSeasonId },
        at: params.now(),
      })
    }

    entities = entities.map((entity) => {
      const archetype = params.entityArchetypes.find((a) => a.id === entity.archetypeId)
      if (!archetype) return entity

      const variationValue = deriveDeterministicVariation({
        worldId: sharedState.worldId,
        worldVersion: sharedState.worldVersion,
        tick: clock.tick,
        locationId: entity.locationId,
        seasonId: season.currentSeasonId,
        seed: params.seed,
      })
      const advanced = advanceEntityLifecycle(entity, archetype, ecology, variationValue, clock.tick)
      if (advanced.lifecyclePhase !== entity.lifecyclePhase) {
        events.push({
          type: "entity.lifecycle_changed",
          worldId: sharedState.worldId,
          tick: clock.tick,
          detail: { entityId: entity.id, from: entity.lifecyclePhase, to: advanced.lifecyclePhase },
          at: params.now(),
        })
      }
      return advanced
    })
  }

  if (params.ticks > 0) {
    events.push({ type: "clock.advanced", worldId: sharedState.worldId, tick: sharedState.clock.tick, detail: { ticks: params.ticks }, at: params.now() })
  }

  return { sharedState, entities, events }
}
