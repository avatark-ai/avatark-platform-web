import { test } from "node:test"
import assert from "node:assert/strict"
import type { EncounterRule, EntityArchetype, SeasonDefinition, SharedWorldState } from "@avatark/living-systems-contracts"
import { computeDeterministicCatchUp } from "./catchUp.ts"
import { createCheckpoint, recoverAuthoritativeState } from "./checkpoint.ts"
import { InMemoryWorldCheckpointRepository, InMemoryWorldLifecycleRepository } from "./inMemoryDurableRepositories.ts"
import { InMemoryWorldLeaseRepository } from "./inMemoryLeaseRepository.ts"
import { nextLifecycleState } from "./lifecycle.ts"

// Sprint 9, Phase 15: the same fictional, non-Vrindavan fixture pattern
// Sprint 7's own otherWorldGrammar.test.ts already established (a
// "living-forest" fixture with its own season names/entity/encounter,
// never Rama canon, never additional Vrindavan content) -- run here
// through every piece of Sprint 9's DURABLE machinery instead of just
// the simulation engine, to prove persistence, checkpointing,
// deterministic catch-up, leasing, and lifecycle are equally world-
// neutral. No import in this file, and no line in catchUp.ts/
// checkpoint.ts/lifecycle.ts/inMemoryDurableRepositories.ts/
// inMemoryLeaseRepository.ts, mentions "forest," "vrindavan," or any
// franchise name.

const CANOPY_ENVELOPE = { temperatureBand: "moderate" as const, precipitationBand: "high" as const, humidityBand: "high" as const, hydrologyBaselineBand: "high" as const, vegetationActivityBand: "high" as const, animalActivityBand: "high" as const }
const DROUGHT_ENVELOPE = { temperatureBand: "high" as const, precipitationBand: "low" as const, humidityBand: "low" as const, hydrologyBaselineBand: "low" as const, vegetationActivityBand: "low" as const, animalActivityBand: "low" as const }

const CANOPY_SEASON: SeasonDefinition = { id: "canopy-wet", name: "Canopy Wet", order: 1, canonId: "STK-CAN-999", environmentalEnvelope: CANOPY_ENVELOPE, minDurationTicks: 3, allowedNextSeasonIds: ["drought"] }
const DROUGHT_SEASON: SeasonDefinition = { id: "drought", name: "Drought", order: 2, canonId: "STK-CAN-999", environmentalEnvelope: DROUGHT_ENVELOPE, minDurationTicks: 3, allowedNextSeasonIds: [] }
const FOREST_SEASONS = [CANOPY_SEASON, DROUGHT_SEASON]

const DEER_HERD: EntityArchetype = { id: "deer-herd", name: "Deer Herd", locationId: "forest-clearing", lifecyclePhases: ["scattered", "grazing", "migrating"], initialLifecyclePhase: "scattered" }
const FOREST_ARCHETYPES = [DEER_HERD]

const CLEARING_ENCOUNTER: EncounterRule = { id: "forest-clearing-grazing-sign", locationId: "forest-clearing", category: "ambient", condition: { band: "animalActivityBand", atLeast: "high" } }
void CLEARING_ENCOUNTER // reserved for a future encounter-availability assertion in this fixture; not needed by the persistence-layer proofs below

const FOREST_INSTANCE_ID = "living-forest-fixture"

function freshForestState(): SharedWorldState {
  return {
    worldId: FOREST_INSTANCE_ID,
    worldVersion: 1,
    clock: { worldId: FOREST_INSTANCE_ID, tick: 0, paused: false },
    season: { currentSeasonId: "canopy-wet", enteredAtTick: 0 },
    environment: {
      weather: { temperatureBand: "moderate", precipitationBand: "high", humidityBand: "high" },
      hydrology: { hydrologyBand: "high", soilMoistureBand: "high" },
      ecology: { vegetationActivityBand: "high", animalActivityBand: "high" },
    },
  }
}

const fixedNow = () => "2026-08-08T00:00:00.000Z"

test("deterministic catch-up crosses the forest fixture's own season boundary, unmodified engine", () => {
  const result = computeDeterministicCatchUp({
    worldInstanceId: FOREST_INSTANCE_ID,
    sharedState: freshForestState(),
    entities: [{ id: "herd-1", archetypeId: "deer-herd", locationId: "forest-clearing", lifecyclePhase: "scattered", attributes: {}, lastUpdatedTick: 0 }],
    seasonDefinitions: FOREST_SEASONS,
    entityArchetypes: FOREST_ARCHETYPES,
    ticks: 3,
    seed: "forest-persistence-seed",
    now: fixedNow,
  })

  assert.equal(result.sharedState.season.currentSeasonId, "drought")
  assert.ok(result.eventRecords.some((e) => e.type === "season.transitioned"))
})

test("checkpoint + recovery reconstructs the forest fixture's state exactly, through the same recovery function Vrindavan uses", async () => {
  const checkpointRepo = new InMemoryWorldCheckpointRepository()
  const toCheckpoint = computeDeterministicCatchUp({
    worldInstanceId: FOREST_INSTANCE_ID,
    sharedState: freshForestState(),
    entities: [{ id: "herd-1", archetypeId: "deer-herd", locationId: "forest-clearing", lifecyclePhase: "scattered", attributes: {}, lastUpdatedTick: 0 }],
    seasonDefinitions: FOREST_SEASONS,
    entityArchetypes: FOREST_ARCHETYPES,
    ticks: 2,
    seed: "forest-persistence-seed",
    now: fixedNow,
  })
  const checkpoint = createCheckpoint({
    id: "forest-ckpt-1",
    worldInstanceId: FOREST_INSTANCE_ID,
    checkpointVersion: 1,
    stateVersion: 1,
    sharedState: toCheckpoint.sharedState,
    entities: toCheckpoint.entities,
    eventSequenceAsOf: 0,
    reason: "periodic",
    now: fixedNow,
  })
  await checkpointRepo.save(checkpoint)

  const postCheckpoint = computeDeterministicCatchUp({
    worldInstanceId: FOREST_INSTANCE_ID,
    sharedState: toCheckpoint.sharedState,
    entities: toCheckpoint.entities,
    seasonDefinitions: FOREST_SEASONS,
    entityArchetypes: FOREST_ARCHETYPES,
    ticks: 2,
    seed: "forest-persistence-seed",
    now: fixedNow,
  })
  const eventsAfterCheckpoint = postCheckpoint.eventRecords.map((e, i) => ({ ...e, sequence: i + 1 }))

  const loaded = await checkpointRepo.loadLatest(FOREST_INSTANCE_ID)
  assert.ok(loaded)
  const recovered = recoverAuthoritativeState({
    checkpoint: loaded,
    eventsAfterCheckpoint,
    seasonDefinitions: FOREST_SEASONS,
    entityArchetypes: FOREST_ARCHETYPES,
    seed: "forest-persistence-seed",
    now: fixedNow,
  })

  assert.deepEqual(recovered.sharedState, postCheckpoint.sharedState)
})

test("lease acquisition and lifecycle transitions work identically for the forest fixture -- no world-identity branching anywhere in either mechanism", async () => {
  const leaseRepo = new InMemoryWorldLeaseRepository()
  const lifecycleRepo = new InMemoryWorldLifecycleRepository()

  const acquired = await leaseRepo.acquire(FOREST_INSTANCE_ID, "forest-worker", 60_000, fixedNow)
  assert.equal(acquired.status, "acquired")

  const waking = nextLifecycleState("DORMANT", "visitor_arrived")
  assert.equal(waking, "WAKING")
  await lifecycleRepo.save({ worldInstanceId: FOREST_INSTANCE_ID, state: waking!, lastActiveAt: fixedNow(), lastCheckpointTick: 0 })

  const stored = await lifecycleRepo.get(FOREST_INSTANCE_ID)
  assert.equal(stored?.state, "WAKING")
})
