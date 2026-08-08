import { test } from "node:test"
import assert from "node:assert/strict"
import { InMemoryVisitorWorldMemoryRepository } from "@avatark/living-systems-runtime"
import { emptyVisitorWorldMemory } from "@avatark/living-systems-contracts"
import { computeDeterministicCatchUp } from "./catchUp.ts"
import { InMemoryDurableWorldStateRepository } from "./inMemoryDurableRepositories.ts"
import { fixedNow, freshVrindavanEntities, freshVrindavanSharedState, VRINDAVAN_ARCHETYPES, VRINDAVAN_SEASONS } from "./testFixtures.ts"

// Test matrix #12/#13: two visitors, one world instance.
test("two visitors reading the same world instance see identical world truth but independently isolated memory", async () => {
  const worldInstanceId = "living-vrindavan"
  const durableRepo = new InMemoryDurableWorldStateRepository()
  const memoryRepo = new InMemoryVisitorWorldMemoryRepository()

  const caughtUp = computeDeterministicCatchUp({
    worldInstanceId,
    sharedState: freshVrindavanSharedState(worldInstanceId),
    entities: freshVrindavanEntities(),
    seasonDefinitions: VRINDAVAN_SEASONS,
    entityArchetypes: VRINDAVAN_ARCHETYPES,
    ticks: 4,
    seed: "multi-visitor-seed",
    now: fixedNow,
  })
  await durableRepo.conditionalSave({ worldInstanceId, sharedState: caughtUp.sharedState, entities: caughtUp.entities, updatedAt: fixedNow() }, null)

  await memoryRepo.save({ ...emptyVisitorWorldMemory("visitor-alice", worldInstanceId), lastLocationId: "yamuna", updatedAtTick: 4 })
  await memoryRepo.save({ ...emptyVisitorWorldMemory("visitor-bob", worldInstanceId), lastLocationId: "kadamba-grove", updatedAtTick: 4 })

  // Same world truth, read independently by each visitor's own request.
  const worldStateForAlice = await durableRepo.load(worldInstanceId)
  const worldStateForBob = await durableRepo.load(worldInstanceId)
  assert.deepEqual(worldStateForAlice, worldStateForBob, "no visitor identity influences shared world truth")
  assert.equal(worldStateForAlice?.sharedState.season.currentSeasonId, "grishma")

  // Independent, isolated visitor memory.
  const aliceMemory = await memoryRepo.get("visitor-alice", worldInstanceId)
  const bobMemory = await memoryRepo.get("visitor-bob", worldInstanceId)
  assert.equal(aliceMemory?.lastLocationId, "yamuna")
  assert.equal(bobMemory?.lastLocationId, "kadamba-grove")
  assert.notDeepEqual(aliceMemory, bobMemory, "no cross-user bleed")
})

// Test matrix #14: two instances, one definition, independent advancement.
test("two world instances derived from the same definition advance completely independently", async () => {
  const durableRepo = new InMemoryDurableWorldStateRepository()

  const instanceA = "living-vrindavan-instance-a"
  const instanceB = "living-vrindavan-instance-b"

  const advancedA = computeDeterministicCatchUp({
    worldInstanceId: instanceA,
    sharedState: freshVrindavanSharedState(instanceA),
    entities: freshVrindavanEntities(),
    seasonDefinitions: VRINDAVAN_SEASONS,
    entityArchetypes: VRINDAVAN_ARCHETYPES,
    ticks: 4,
    seed: "instance-a-seed",
    now: fixedNow,
  })
  await durableRepo.conditionalSave({ worldInstanceId: instanceA, sharedState: advancedA.sharedState, entities: advancedA.entities, updatedAt: fixedNow() }, null)

  // Instance B only advances 1 tick -- stays in Vasanta, while A has
  // already crossed into Grishma.
  const advancedB = computeDeterministicCatchUp({
    worldInstanceId: instanceB,
    sharedState: freshVrindavanSharedState(instanceB),
    entities: freshVrindavanEntities(),
    seasonDefinitions: VRINDAVAN_SEASONS,
    entityArchetypes: VRINDAVAN_ARCHETYPES,
    ticks: 1,
    seed: "instance-b-seed",
    now: fixedNow,
  })
  await durableRepo.conditionalSave({ worldInstanceId: instanceB, sharedState: advancedB.sharedState, entities: advancedB.entities, updatedAt: fixedNow() }, null)

  const stateA = await durableRepo.load(instanceA)
  const stateB = await durableRepo.load(instanceB)

  assert.equal(stateA?.sharedState.season.currentSeasonId, "grishma")
  assert.equal(stateB?.sharedState.season.currentSeasonId, "vasanta")
  assert.equal(stateA?.sharedState.clock.tick, 4)
  assert.equal(stateB?.sharedState.clock.tick, 1)
  assert.equal(stateA?.stateVersion, 1, "each instance has its own independent version numbering, not a shared global counter")
  assert.equal(stateB?.stateVersion, 1)
})
