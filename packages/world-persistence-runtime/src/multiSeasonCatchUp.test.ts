import { test } from "node:test"
import assert from "node:assert/strict"
import type { EntityArchetype, SeasonDefinition, SharedWorldState } from "@avatark/living-systems-contracts"
import { computeDeterministicCatchUp } from "./catchUp.ts"

// Sprint 17, §7/§10 task 5: Living Vrindavan authors only 2 seasons today
// (see docs/SPRINT17_IMPLEMENTATION_PREP.md §7), so a genuine
// 2-season-crossing-in-one-catch-up proof cannot use real Vrindavan
// Canon without authoring new Canon (explicitly prohibited). Following
// the SAME synthetic-fixture convention every other portability test in
// this package already uses (livingForestPortability.test.ts,
// packages/living-systems-runtime/src/otherWorldGrammar.test.ts), this
// file defines its own throwaway 3-season chain, never Vrindavan Canon,
// to prove `advanceWorldSimulation`'s existing per-tick loop already
// handles multiple season boundaries inside a single dormant catch-up
// correctly -- with no special-case branch, exactly as
// @avatark/living-systems-runtime's own simulation.ts already claims by
// construction (§7's own "not proven by an existing test, though" gap).

const SPROUT_ENVELOPE = { temperatureBand: "moderate" as const, precipitationBand: "high" as const, humidityBand: "high" as const, hydrologyBaselineBand: "high" as const, vegetationActivityBand: "high" as const, animalActivityBand: "moderate" as const }
const GROWTH_ENVELOPE = { temperatureBand: "high" as const, precipitationBand: "moderate" as const, humidityBand: "moderate" as const, hydrologyBaselineBand: "moderate" as const, vegetationActivityBand: "moderate" as const, animalActivityBand: "high" as const }
const DECAY_ENVELOPE = { temperatureBand: "low" as const, precipitationBand: "low" as const, humidityBand: "low" as const, hydrologyBaselineBand: "low" as const, vegetationActivityBand: "low" as const, animalActivityBand: "low" as const }

// Deliberately short minDurationTicks (2 each) so a single, realistic
// dormant-absence catch-up window (6 ticks) crosses BOTH boundaries --
// sprout->growth at tick 2, growth->decay at tick 4 -- rather than
// needing an implausibly long synthetic absence to exercise this.
const SPROUT_SEASON: SeasonDefinition = { id: "sprout", name: "Sprout", order: 1, canonId: "STK-SYN-MULTI", environmentalEnvelope: SPROUT_ENVELOPE, minDurationTicks: 2, allowedNextSeasonIds: ["growth"] }
const GROWTH_SEASON: SeasonDefinition = { id: "growth", name: "Growth", order: 2, canonId: "STK-SYN-MULTI", environmentalEnvelope: GROWTH_ENVELOPE, minDurationTicks: 2, allowedNextSeasonIds: ["decay"] }
const DECAY_SEASON: SeasonDefinition = { id: "decay", name: "Decay", order: 3, canonId: "STK-SYN-MULTI", environmentalEnvelope: DECAY_ENVELOPE, minDurationTicks: 2, allowedNextSeasonIds: [] }
const MULTI_SEASONS = [SPROUT_SEASON, GROWTH_SEASON, DECAY_SEASON]

const SYNTH_ARCHETYPES: EntityArchetype[] = [{ id: "synthetic-critter", name: "Synthetic Critter", locationId: "synthetic-clearing", lifecyclePhases: ["idle", "active"], initialLifecyclePhase: "idle" }]

const SYNTH_INSTANCE_ID = "synthetic-multi-season-fixture"

function freshSynthState(): SharedWorldState {
  return {
    worldId: SYNTH_INSTANCE_ID,
    worldVersion: 1,
    clock: { worldId: SYNTH_INSTANCE_ID, tick: 0, paused: false },
    season: { currentSeasonId: "sprout", enteredAtTick: 0 },
    environment: {
      weather: { temperatureBand: "moderate", precipitationBand: "high", humidityBand: "high" },
      hydrology: { hydrologyBand: "high", soilMoistureBand: "high" },
      ecology: { vegetationActivityBand: "high", animalActivityBand: "moderate" },
    },
  }
}

const fixedNow = () => "2026-08-08T00:00:00.000Z"

function freshEntities() {
  return [{ id: "critter-1", archetypeId: "synthetic-critter", locationId: "synthetic-clearing", lifecyclePhase: "idle" as const, attributes: {}, lastUpdatedTick: 0 }]
}

test("a single dormant catch-up spanning 2 season boundaries produces the identical end state as stepping tick-by-tick through both crossings", () => {
  const oneShot = computeDeterministicCatchUp({
    worldInstanceId: SYNTH_INSTANCE_ID,
    sharedState: freshSynthState(),
    entities: freshEntities(),
    seasonDefinitions: MULTI_SEASONS,
    entityArchetypes: SYNTH_ARCHETYPES,
    ticks: 6,
    seed: "multi-season-seed",
    now: fixedNow,
  })

  // sprout (minDuration 2) -> growth at tick 2 -> decay at tick 4 -- both
  // boundaries crossed inside this single 6-tick catch-up call.
  assert.equal(oneShot.sharedState.season.currentSeasonId, "decay")
  assert.equal(oneShot.sharedState.clock.tick, 6)
  const crossings = oneShot.eventRecords.filter((e) => e.type === "season.transitioned")
  assert.equal(crossings.length, 2, "both the sprout->growth and growth->decay boundaries are recorded, not just the first")

  // Stepping one tick at a time, 6 times, from the identical starting
  // state, using the SAME unmodified advanceWorldSimulation entry point
  // (computeDeterministicCatchUp with ticks=1 each call) -- this is the
  // "active world ticking forward in real time" path catchUp.ts's own
  // doc comment already claims reaches an identical state to the
  // dormant path; this test is the multi-crossing case that claim had
  // not yet been exercised for.
  let steppedState = freshSynthState()
  let steppedEntities: ReturnType<typeof computeDeterministicCatchUp>["entities"] = freshEntities()
  for (let i = 0; i < 6; i++) {
    const stepped = computeDeterministicCatchUp({
      worldInstanceId: SYNTH_INSTANCE_ID,
      sharedState: steppedState,
      entities: steppedEntities,
      seasonDefinitions: MULTI_SEASONS,
      entityArchetypes: SYNTH_ARCHETYPES,
      ticks: 1,
      seed: "multi-season-seed",
      now: fixedNow,
    })
    steppedState = stepped.sharedState
    steppedEntities = stepped.entities
  }

  assert.deepEqual(oneShot.sharedState, steppedState, "one 6-tick catch-up crossing 2 season boundaries must byte-for-byte match 6 single-tick advances")
  assert.deepEqual(oneShot.entities, steppedEntities)
})

test("a catch-up window landing exactly on a boundary tick crosses it, not off-by-one short", () => {
  const result = computeDeterministicCatchUp({
    worldInstanceId: SYNTH_INSTANCE_ID,
    sharedState: freshSynthState(),
    entities: freshEntities(),
    seasonDefinitions: MULTI_SEASONS,
    entityArchetypes: SYNTH_ARCHETYPES,
    ticks: 2,
    seed: "multi-season-seed",
    now: fixedNow,
  })
  assert.equal(result.sharedState.season.currentSeasonId, "growth")
  assert.equal(result.sharedState.season.enteredAtTick, 2)
})

test("a catch-up window one tick short of a boundary does not cross it early", () => {
  const result = computeDeterministicCatchUp({
    worldInstanceId: SYNTH_INSTANCE_ID,
    sharedState: freshSynthState(),
    entities: freshEntities(),
    seasonDefinitions: MULTI_SEASONS,
    entityArchetypes: SYNTH_ARCHETYPES,
    ticks: 1,
    seed: "multi-season-seed",
    now: fixedNow,
  })
  assert.equal(result.sharedState.season.currentSeasonId, "sprout")
})
