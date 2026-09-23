// World facts: the authoritative runtime inputs a consumer projection is
// mapped FROM. A producer reads facts; it never reads a consumer payload
// back as a source.
//
// M09 has exactly one fact source: the Living Forest kernel vertical slice
// (lib/livingForest/), driven through its REAL host functions over a short
// deterministic timeline. Its output is fixture-backed runtime state — it
// is not production Living Forest truth, and producers classify it as such
// (sourceRevision "fixture:…", lifecycle PREVIEW).

import { createHash } from "node:crypto"
import { emptyProtectedNarrativeProjection } from "@avatark/living-systems-contracts"
import type { LivingEntityState, SeasonDefinition, SharedWorldState } from "@avatark/living-systems-contracts"
import type { LocationResourceAffordance } from "@avatark/living-population-contracts"
import type { WorldEvent } from "@avatark/world-memory-contracts"
import type { StoryLink } from "@avatark/world-consumer-contracts"
import { deriveWorldEvents } from "@avatark/world-memory-runtime"
import { resolveDayPhase } from "@avatark/living-rhythms-runtime"
import {
  LIVING_FOREST_DAY_PHASE_SCHEDULE,
  LIVING_FOREST_RESOURCE_AFFORDANCES,
  LIVING_FOREST_SEASONS,
  LIVING_FOREST_WORLD_ID,
} from "../livingForest/definition.ts"
import {
  advanceForest,
  computeForestEncounterOpportunities,
  createFreshForestSharedState,
  createInitialForestPopulation,
  realizeForestEncounters,
  recordForestMemory,
} from "../livingForest/hostService.ts"
import { createLivingForestRepositories } from "../livingForest/repositories.ts"

/** Health of the authoritative source, declared by the fact source (never guessed by a consumer). */
export type SourceStatus = "LIVE" | "LAGGING" | "OFFLINE" | "NOT_PUBLISHED"

export interface WorldFacts {
  runtimeWorldId: string
  sharedState: SharedWorldState
  seasonDefinitions: readonly SeasonDefinition[]
  /** Consumer-safe day-phase label for a tick, or null when the world has no day cycle. */
  dayPhaseForTick: (tick: number) => { id: string; label: string } | null
  ticksPerDay: number | null
  populationEntities: readonly LivingEntityState[]
  /** Every stored World Memory event (significance-filtered at write time). */
  worldEvents: readonly WorldEvent[]
  resourceAffordances: readonly LocationResourceAffordance[]
  /** Discovery links only — never world authority. */
  storyLinks: readonly StoryLink[]
  /** Wall-clock instant the facts represent. */
  observedAt: string
  sourceRevision: string
  sourceStatus: SourceStatus
  /** True when these facts come from a fixture/test world rather than a production world instance. */
  fixtureBacked: boolean
}

export interface WorldFactSource {
  load(runtimeWorldId: string): Promise<WorldFacts | null>
}

const PHASE_LABEL: Record<string, string> = {
  DAWN: "dawn", MORNING: "morning", MIDDAY: "midday", AFTERNOON: "afternoon", DUSK: "dusk", EVENING: "evening", NIGHT: "night",
}

// ── Living Forest fixture timeline ─────────────────────────────────

export const LIVING_FOREST_FIXTURE_TIMELINE = {
  seed: "worldk-m09-fixture",
  /** A visitor is present at tick 0 (arrival encounter at forest-clearing). */
  arrivalTick: 0,
  /** One tick later the visitor leaves; the deer have begun to move. */
  departureTick: 1,
  /** The world then runs unobserved long enough for canopy-wet -> drought. */
  ticksWhileAway: 5,
  observedAt: "2026-09-23T17:00:00.000Z",
} as const

// Fixture-only story link (M07 proposed slugs; StreamK owns the final values).
const LIVING_FOREST_FIXTURE_STORIES: StoryLink[] = [
  { source: "streamk", storySlug: "the-forest-remembers", episodeSlug: "cinematic-episode-01", title: "The Forest Remembers", relation: "ENTERS_WORLD" },
]

export interface LivingForestFixtureRun {
  facts: WorldFacts
  /** Entities present with the visitor at arrival (participation/encounter facts). */
  arrivalCompanionEntityIds: string[]
}

/**
 * Runs the Living Forest vertical slice through its real host functions:
 * arrival encounter -> 1 tick (movement) -> visitor leaves -> 5 unobserved
 * ticks (season turns) -> memory recorded at every step.
 */
export async function runLivingForestFixtureTimeline(observedAt: string = LIVING_FOREST_FIXTURE_TIMELINE.observedAt): Promise<LivingForestFixtureRun> {
  const t = LIVING_FOREST_FIXTURE_TIMELINE
  const now = () => observedAt
  const repositories = createLivingForestRepositories()
  const protectedNarrative = emptyProtectedNarrativeProjection(LIVING_FOREST_WORLD_ID)
  let sharedState = createFreshForestSharedState()
  let population = createInitialForestPopulation()

  // Arrival: encounter opportunity at the entry patch, realized and remembered.
  const opportunities = computeForestEncounterOpportunities(population.entities, sharedState, protectedNarrative)
  const realized = await realizeForestEncounters({
    opportunities,
    populationEntities: population.entities,
    behaviorStates: population.behaviorStates,
    groups: population.groups,
    protectedNarrative,
    worldVersion: sharedState.worldVersion,
    tick: sharedState.clock.tick,
    seasonId: sharedState.season.currentSeasonId,
    repositories,
  })
  await recordForestMemory({ now, populationEvents: [], resolvedEncounters: realized.resolvedForMemory, repositories })
  const arrivalCompanionEntityIds = population.entities.filter((e) => e.locationId === "forest-clearing").map((e) => e.id)

  // One observed tick.
  const first = advanceForest({ sharedState, population, ticks: t.departureTick - t.arrivalTick, seed: t.seed, now, protectedNarrative })
  await recordForestMemory({ now, populationEvents: first.result.populationEvents, resolvedEncounters: [], repositories })
  sharedState = first.sharedState
  population = first.population

  // Unobserved: the world continues without the visitor.
  const beforeSeason = sharedState.season.currentSeasonId
  const away = advanceForest({ sharedState, population, ticks: t.ticksWhileAway, seed: t.seed, now, protectedNarrative })
  await recordForestMemory({ now, populationEvents: away.result.populationEvents, resolvedEncounters: [], repositories })
  if (away.sharedState.season.currentSeasonId !== beforeSeason) {
    // Same Host-layer before/after season diff lib/worldMemory/hostService.ts performs.
    const seasonEvents = deriveWorldEvents({
      worldId: LIVING_FOREST_WORLD_ID,
      now,
      seasonTransitions: [{ tick: away.sharedState.season.enteredAtTick, fromSeasonId: beforeSeason, toSeasonId: away.sharedState.season.currentSeasonId }],
      environmentalBandChanges: [],
      locationConditionChanges: [],
      populationEvents: [],
      encounterAvailabilityChanges: [],
    })
    for (const e of seasonEvents) await repositories.worldEvents.append(e)
  }
  sharedState = away.sharedState
  population = away.population

  const worldEvents = [...(await repositories.worldEvents.listSince(LIVING_FOREST_WORLD_ID, -1))].sort((a, b) => a.tick - b.tick || a.id.localeCompare(b.id))
  const digest = createHash("sha256")
    .update(JSON.stringify({ tick: sharedState.clock.tick, season: sharedState.season, events: worldEvents.map((e) => e.id) }))
    .digest("hex")
    .slice(0, 16)

  return {
    arrivalCompanionEntityIds,
    facts: {
      runtimeWorldId: LIVING_FOREST_WORLD_ID,
      sharedState,
      seasonDefinitions: LIVING_FOREST_SEASONS,
      dayPhaseForTick: (tick) => {
        const phase = resolveDayPhase(LIVING_FOREST_DAY_PHASE_SCHEDULE, tick)
        return phase ? { id: phase.toLowerCase(), label: PHASE_LABEL[phase] ?? phase.toLowerCase() } : null
      },
      ticksPerDay: LIVING_FOREST_DAY_PHASE_SCHEDULE.ticksPerCycle,
      populationEntities: population.entities,
      worldEvents,
      resourceAffordances: LIVING_FOREST_RESOURCE_AFFORDANCES,
      storyLinks: LIVING_FOREST_FIXTURE_STORIES,
      observedAt,
      sourceRevision: `fixture:living-forest-vertical-slice:${digest}`,
      sourceStatus: "LIVE",
      fixtureBacked: true,
    },
  }
}

/** Fact source over the Living Forest fixture timeline (computed once, then reused). */
export function createLivingForestFixtureFactSource(observedAt?: string): WorldFactSource {
  let run: Promise<LivingForestFixtureRun> | null = null
  return {
    async load(runtimeWorldId) {
      if (runtimeWorldId !== LIVING_FOREST_WORLD_ID) return null
      run ??= runLivingForestFixtureTimeline(observedAt)
      return (await run).facts
    },
  }
}
