import { test } from "node:test"
import assert from "node:assert/strict"
import { createCheckpoint, recoverAuthoritativeState } from "./checkpoint.ts"
import { computeDeterministicCatchUp } from "./catchUp.ts"
import { CorruptCheckpointError } from "@avatark/world-persistence-contracts"
import { fixedNow, freshVrindavanEntities, freshVrindavanSharedState, VRINDAVAN_ARCHETYPES, VRINDAVAN_SEASONS } from "./testFixtures.ts"

// Test matrix #2: checkpoint creation.
test("createCheckpoint captures the full sharedState/entities as of the state's own tick, not a delta", () => {
  const caughtUp = computeDeterministicCatchUp({
    worldInstanceId: "living-vrindavan",
    sharedState: freshVrindavanSharedState(),
    entities: freshVrindavanEntities(),
    seasonDefinitions: VRINDAVAN_SEASONS,
    entityArchetypes: VRINDAVAN_ARCHETYPES,
    ticks: 4,
    seed: "checkpoint-seed",
    now: fixedNow,
  })

  const checkpoint = createCheckpoint({
    id: "ckpt-1",
    worldInstanceId: "living-vrindavan",
    checkpointVersion: 1,
    stateVersion: 1,
    sharedState: caughtUp.sharedState,
    entities: caughtUp.entities,
    eventSequenceAsOf: caughtUp.eventRecords.length,
    reason: "periodic",
    now: fixedNow,
  })

  assert.equal(checkpoint.tick, 4)
  assert.deepEqual(checkpoint.sharedState, caughtUp.sharedState)
  assert.deepEqual(checkpoint.entities, caughtUp.entities)
  assert.equal(checkpoint.reason, "periodic")
})

// Test matrix #3/#4: checkpoint recovery + event replay after checkpoint.
// "checkpoint N + world-system events after N -> recovered authoritative
// state" (Phase 3's own diagram), proven equal to what continuing to
// advance directly from N would have produced.
test("recovering from a checkpoint plus its trailing events reproduces the exact state continuing to advance would have reached", () => {
  const checkpointTicks = computeDeterministicCatchUp({
    worldInstanceId: "living-vrindavan",
    sharedState: freshVrindavanSharedState(),
    entities: freshVrindavanEntities(),
    seasonDefinitions: VRINDAVAN_SEASONS,
    entityArchetypes: VRINDAVAN_ARCHETYPES,
    ticks: 3,
    seed: "recovery-seed",
    now: fixedNow,
  })

  const checkpoint = createCheckpoint({
    id: "ckpt-recover-1",
    worldInstanceId: "living-vrindavan",
    checkpointVersion: 1,
    stateVersion: 1,
    sharedState: checkpointTicks.sharedState,
    entities: checkpointTicks.entities,
    eventSequenceAsOf: 0,
    reason: "periodic",
    now: fixedNow,
  })

  // What actually happened after the checkpoint (e.g. the world kept
  // advancing 5 more ticks before the runtime was lost) -- represented
  // here purely as the durable events that call would have produced,
  // exactly as a real DurableWorldSystemEventRepository.listAfter()
  // would return them.
  const postCheckpoint = computeDeterministicCatchUp({
    worldInstanceId: "living-vrindavan",
    sharedState: checkpointTicks.sharedState,
    entities: checkpointTicks.entities,
    seasonDefinitions: VRINDAVAN_SEASONS,
    entityArchetypes: VRINDAVAN_ARCHETYPES,
    ticks: 5,
    seed: "recovery-seed",
    now: fixedNow,
  })
  const eventsAfterCheckpoint = postCheckpoint.eventRecords.map((event, index) => ({ ...event, sequence: index + 1 }))

  const recovered = recoverAuthoritativeState({
    checkpoint,
    eventsAfterCheckpoint,
    seasonDefinitions: VRINDAVAN_SEASONS,
    entityArchetypes: VRINDAVAN_ARCHETYPES,
    seed: "recovery-seed",
    now: fixedNow,
  })

  assert.deepEqual(recovered.sharedState, postCheckpoint.sharedState)
  assert.deepEqual(recovered.entities, postCheckpoint.entities)
  assert.equal(recovered.ticksReplayed, 5)
})

test("recovering from a checkpoint with no trailing events returns the checkpoint's own state unchanged", () => {
  const checkpoint = createCheckpoint({
    id: "ckpt-2",
    worldInstanceId: "living-vrindavan",
    checkpointVersion: 1,
    stateVersion: 1,
    sharedState: freshVrindavanSharedState(),
    entities: freshVrindavanEntities(),
    eventSequenceAsOf: 0,
    reason: "manual",
    now: fixedNow,
  })

  const recovered = recoverAuthoritativeState({
    checkpoint,
    eventsAfterCheckpoint: [],
    seasonDefinitions: VRINDAVAN_SEASONS,
    entityArchetypes: VRINDAVAN_ARCHETYPES,
    seed: "recovery-seed",
    now: fixedNow,
  })

  assert.deepEqual(recovered.sharedState, checkpoint.sharedState)
  assert.equal(recovered.ticksReplayed, 0)
})

test("an event belonging to a different world instance is a corrupt-checkpoint condition, never silently accepted", () => {
  const checkpoint = createCheckpoint({
    id: "ckpt-3",
    worldInstanceId: "living-vrindavan",
    checkpointVersion: 1,
    stateVersion: 1,
    sharedState: freshVrindavanSharedState(),
    entities: freshVrindavanEntities(),
    eventSequenceAsOf: 0,
    reason: "manual",
    now: fixedNow,
  })

  assert.throws(
    () =>
      recoverAuthoritativeState({
        checkpoint,
        eventsAfterCheckpoint: [{ type: "clock.advanced", worldId: "living-vrindavan", worldInstanceId: "some-other-world", tick: 1, detail: { ticks: 1 }, at: fixedNow(), eventId: "x", sequence: 1 }],
        seasonDefinitions: VRINDAVAN_SEASONS,
        entityArchetypes: VRINDAVAN_ARCHETYPES,
        seed: "recovery-seed",
        now: fixedNow,
      }),
    CorruptCheckpointError,
  )
})
