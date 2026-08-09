import { test } from "node:test"
import assert from "node:assert/strict"
import type { EncounterRule, EntityArchetype, SeasonDefinition, SharedWorldState } from "@avatark/living-systems-contracts"
import { computeDeterministicCatchUp } from "./catchUp.ts"
import { createCheckpoint, recoverAuthoritativeState } from "./checkpoint.ts"
import { InMemoryDurableWorldStateRepository, InMemoryWorldCheckpointRepository, InMemoryWorldLifecycleRepository } from "./inMemoryDurableRepositories.ts"
import { InMemoryWorldLeaseRepository } from "./inMemoryLeaseRepository.ts"
import { nextLifecycleState } from "./lifecycle.ts"
import { fixedRateTickPolicy } from "./tickPolicy.ts"
import { resolveTicksToApply } from "./wakeCatchUpPlanner.ts"

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

// Sprint 17, §10 task 9: a 5th Living Forest fixture, proving the
// crash-recovery fix itself (not just the pre-existing catch-up/
// checkpoint/lease/lifecycle primitives the 4 tests above already
// cover) is world-neutral -- composed here entirely from this package's
// own primitives (computeDeterministicCatchUp, InMemoryDurableWorldState/
// Lifecycle repositories, resolveTicksToApply), the SAME composition
// lib/worldPersistence/hostService.ts's own catchUpCausalEnvironment/
// commitWakeCompletion perform for Living Vrindavan, never touching
// that lib/ Host layer or any Vrindavan-specific constant.
test("crash mid-wake + retry (world-neutral): a crash after the environment's own catch-up commits but before the composed chain's final lifecycle commit is retried without losing or double-applying ticks", async () => {
  const stateRepo = new InMemoryDurableWorldStateRepository()
  const lifecycleRepo = new InMemoryWorldLifecycleRepository()
  const leaseRepo = new InMemoryWorldLeaseRepository()
  const tickPolicy = fixedRateTickPolicy(1)
  const worldInstanceId = FOREST_INSTANCE_ID + "-crash-recovery"
  const entities = [{ id: "herd-1", archetypeId: "deer-herd", locationId: "forest-clearing", lifecyclePhase: "scattered" as const, attributes: {}, lastUpdatedTick: 0 }]

  async function attempt(nowMs: number): Promise<{ tick: number; committed: boolean }> {
    const now = () => new Date(nowMs).toISOString()
    await leaseRepo.acquire(worldInstanceId, "forest-worker", 60_000, now)

    const lifecycleBefore = await lifecycleRepo.get(worldInstanceId)
    const current = await stateRepo.load(worldInstanceId)
    const sharedState = current?.sharedState ?? freshForestState()
    const currentEntities = current?.entities ?? entities
    const expectedVersion = current?.stateVersion ?? null
    const lastActiveAt = lifecycleBefore?.lastActiveAt ?? current?.updatedAt ?? new Date(0).toISOString()
    const lastCheckpointTick = lifecycleBefore?.lastCheckpointTick ?? sharedState.clock.tick

    const ticks = resolveTicksToApply({ lastActiveAt, lastCheckpointTick, currentTick: sharedState.clock.tick, now, tickPolicy })
    if (ticks === 0) return { tick: sharedState.clock.tick, committed: false }

    const caughtUp = computeDeterministicCatchUp({ worldInstanceId, sharedState, entities: [...currentEntities], seasonDefinitions: FOREST_SEASONS, entityArchetypes: FOREST_ARCHETYPES, ticks, seed: "forest-crash-seed", now })
    await stateRepo.conditionalSave({ worldInstanceId, sharedState: caughtUp.sharedState, entities: caughtUp.entities, updatedAt: now() }, expectedVersion)

    // The "crash" IS simply returning here -- deliberately never calling
    // lifecycleRepo.save with the new lastActiveAt/lastCheckpointTick,
    // exactly the composed chain's own deferred-commit design.
    return { tick: caughtUp.sharedState.clock.tick, committed: false }
  }

  const crashed = await attempt(5_000)
  assert.equal(crashed.tick, 5_000)
  await leaseRepo.release(worldInstanceId, "forest-worker", (await leaseRepo.getCurrent(worldInstanceId))!.leaseVersion)

  const retried = await attempt(70_000)
  await lifecycleRepo.save({ worldInstanceId, state: "ACTIVE", lastActiveAt: new Date(70_000).toISOString(), lastCheckpointTick: retried.tick })

  assert.equal(retried.tick, 70_000, "the retry reaches the same tick a single uninterrupted 0->70000ms catch-up would, never double-applying the crashed attempt's own already-committed 0->5000 window")
})
