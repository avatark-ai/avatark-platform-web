import { test } from "node:test"
import assert from "node:assert/strict"
import { isSaveConflict } from "@avatark/world-persistence-contracts"
import {
  InMemoryDurableWorldStateRepository,
  InMemoryDurableWorldSystemEventRepository,
  InMemoryWorldCheckpointRepository,
  InMemoryWorldInstanceRepository,
} from "./inMemoryDurableRepositories.ts"
import { createCheckpoint } from "./checkpoint.ts"
import { fixedNow, freshVrindavanEntities, freshVrindavanSharedState } from "./testFixtures.ts"

// Test matrix #1: durable state round-trip.
test("DurableWorldState round-trips through conditionalSave/load", async () => {
  const repo = new InMemoryDurableWorldStateRepository()
  const worldInstanceId = "living-vrindavan"

  assert.equal(await repo.load(worldInstanceId), null, "nothing stored yet")

  const first = await repo.conditionalSave({ worldInstanceId, sharedState: freshVrindavanSharedState(worldInstanceId), entities: freshVrindavanEntities(), updatedAt: fixedNow() }, null)
  assert.equal(first.status, "saved")
  if (first.status === "saved") assert.equal(first.stateVersion, 1)

  const loaded = await repo.load(worldInstanceId)
  assert.ok(loaded)
  assert.equal(loaded.stateVersion, 1)
  assert.deepEqual(loaded.entities, freshVrindavanEntities())
})

// Test matrix #8: stale writer rejected -- Phase 6's central proof.
test("a writer using a stale expectedVersion is rejected with a conflict result, and never overwrites the newer state", async () => {
  const repo = new InMemoryDurableWorldStateRepository()
  const worldInstanceId = "living-vrindavan"
  const base = freshVrindavanSharedState(worldInstanceId)

  const firstWrite = await repo.conditionalSave({ worldInstanceId, sharedState: base, entities: freshVrindavanEntities(), updatedAt: fixedNow() }, null)
  assert.equal(firstWrite.status, "saved")

  // Writer A reads version 1, then a second writer B also advances from
  // version 1 and successfully writes version 2 first.
  const writerBState = { ...base, clock: { ...base.clock, tick: 1 } }
  const writerB = await repo.conditionalSave({ worldInstanceId, sharedState: writerBState, entities: freshVrindavanEntities(), updatedAt: fixedNow() }, 1)
  assert.equal(writerB.status, "saved")
  if (writerB.status === "saved") assert.equal(writerB.stateVersion, 2)

  // Writer A now tries to save against the version it originally read
  // (1) -- stale, must be rejected.
  const staleWriterAState = { ...base, clock: { ...base.clock, tick: 99 } }
  const writerA = await repo.conditionalSave({ worldInstanceId, sharedState: staleWriterAState, entities: freshVrindavanEntities(), updatedAt: fixedNow() }, 1)
  assert.ok(isSaveConflict(writerA))
  if (isSaveConflict(writerA)) {
    assert.equal(writerA.currentVersion, 2)
    assert.equal(writerA.currentState.sharedState.clock.tick, 1, "writer B's state, not writer A's stale attempt, is what's actually stored")
  }

  const finalState = await repo.load(worldInstanceId)
  assert.equal(finalState?.sharedState.clock.tick, 1, "the stale writer never overwrote the newer truth")
})

test("saving with expectedVersion=null against an already-existing row is a conflict, never a silent overwrite of row 1", async () => {
  const repo = new InMemoryDurableWorldStateRepository()
  const worldInstanceId = "living-vrindavan"
  await repo.conditionalSave({ worldInstanceId, sharedState: freshVrindavanSharedState(worldInstanceId), entities: freshVrindavanEntities(), updatedAt: fixedNow() }, null)

  const secondCreateAttempt = await repo.conditionalSave({ worldInstanceId, sharedState: freshVrindavanSharedState(worldInstanceId), entities: freshVrindavanEntities(), updatedAt: fixedNow() }, null)
  assert.ok(isSaveConflict(secondCreateAttempt))
})

// Test matrix #10 (partial -- see also leaseRepository.test.ts and
// catchUp.test.ts): idempotent event append.
test("appending the same event id twice does not duplicate the row, and returns the original sequence", async () => {
  const repo = new InMemoryDurableWorldSystemEventRepository()
  const worldInstanceId = "living-vrindavan"
  const record = { eventId: "evt-fixed-1", worldInstanceId, type: "clock.advanced" as const, worldId: worldInstanceId, tick: 4, detail: { ticks: 4 }, at: fixedNow() }

  const first = await repo.append(record)
  assert.equal(first.status, "appended")
  assert.equal(first.sequence, 1)

  const retry = await repo.append(record)
  assert.equal(retry.status, "duplicate_ignored")
  assert.equal(retry.sequence, 1)

  const all = await repo.listAfter(worldInstanceId, 0)
  assert.equal(all.length, 1, "the retried append never created a second row")
})

test("listAfter only returns events strictly newer than the given sequence, in order", async () => {
  const repo = new InMemoryDurableWorldSystemEventRepository()
  const worldInstanceId = "living-vrindavan"
  for (let i = 1; i <= 3; i++) {
    await repo.append({ eventId: `evt-${i}`, worldInstanceId, type: "clock.advanced" as const, worldId: worldInstanceId, tick: i, detail: { ticks: 1 }, at: fixedNow() })
  }

  const afterFirst = await repo.listAfter(worldInstanceId, 1)
  assert.deepEqual(afterFirst.map((e) => e.sequence), [2, 3])
})

test("creating the same WorldInstance id twice is idempotent -- returns the original, never overwrites definitionVersion", async () => {
  const repo = new InMemoryWorldInstanceRepository()
  const original = await repo.create({ id: "living-vrindavan", definitionId: "living-vrindavan-definition", definitionVersion: 1, createdAt: fixedNow() })
  const retry = await repo.create({ id: "living-vrindavan", definitionId: "living-vrindavan-definition", definitionVersion: 2, createdAt: "2099-01-01T00:00:00.000Z" })
  assert.deepEqual(retry, original)
})

test("saving the same checkpoint id twice never creates a second checkpoint", async () => {
  const repo = new InMemoryWorldCheckpointRepository()
  const checkpoint = createCheckpoint({
    id: "ckpt-idempotent-1",
    worldInstanceId: "living-vrindavan",
    checkpointVersion: 1,
    stateVersion: 1,
    sharedState: freshVrindavanSharedState(),
    entities: freshVrindavanEntities(),
    eventSequenceAsOf: 0,
    reason: "manual",
    now: fixedNow,
  })
  await repo.save(checkpoint)
  await repo.save(checkpoint)
  const latest = await repo.loadLatest("living-vrindavan")
  assert.deepEqual(latest, checkpoint)
})
