import assert from "node:assert/strict"
import { test } from "node:test"
import type { WorldInstanceCanonicalProjectionState } from "@avatark/canonical-event-contracts"
import { InMemoryVisitorCanonicalEventWitnessRepository, InMemoryWorldInstanceCanonicalProjectionStateRepository } from "./inMemoryRepositories.ts"

const SAMPLE_STATE: WorldInstanceCanonicalProjectionState = {
  worldInstanceId: "w1",
  canonicalEventId: "canonical-event-test",
  status: "ACTIVATED",
  activationId: "activation-1",
  mandatedFacts: [],
  scope: { level: "WORLD" },
  provenance: { canonDocIds: [], specId: "spec", specVersion: 1, definitionContentHash: "hash" },
  activatedAtTick: 5,
  completedAtTick: null,
  worldEventId: null,
}

test("InMemoryWorldInstanceCanonicalProjectionStateRepository: get returns null before save, and the saved value after", async () => {
  const repo = new InMemoryWorldInstanceCanonicalProjectionStateRepository()
  assert.equal(await repo.get("w1", "canonical-event-test"), null)
  await repo.save(SAMPLE_STATE)
  assert.deepEqual(await repo.get("w1", "canonical-event-test"), SAMPLE_STATE)
})

test("InMemoryWorldInstanceCanonicalProjectionStateRepository: isolates by worldId", async () => {
  const repo = new InMemoryWorldInstanceCanonicalProjectionStateRepository()
  await repo.save(SAMPLE_STATE)
  assert.equal(await repo.get("w2", "canonical-event-test"), null)
})

test("InMemoryWorldInstanceCanonicalProjectionStateRepository: save is a plain upsert -- a second save overwrites, never duplicates", async () => {
  const repo = new InMemoryWorldInstanceCanonicalProjectionStateRepository()
  await repo.save(SAMPLE_STATE)
  await repo.save({ ...SAMPLE_STATE, status: "COMPLETED", completedAtTick: 6 })
  const all = await repo.listByWorld("w1")
  assert.equal(all.length, 1)
  assert.equal(all[0].status, "COMPLETED")
})

test("InMemoryVisitorCanonicalEventWitnessRepository: append is idempotent by (worldId, userId, canonicalEventId)", async () => {
  const repo = new InMemoryVisitorCanonicalEventWitnessRepository()
  const witness = { userId: "user-1", canonicalEventId: "canonical-event-test", worldInstanceId: "w1", activationId: "activation-1", witnessedAtTick: 10 }
  const first = await repo.append(witness)
  const second = await repo.append({ ...witness, witnessedAtTick: 99 })
  assert.equal(first.status, "appended")
  assert.equal(second.status, "duplicate_ignored")
  const stored = await repo.listByUser("w1", "user-1")
  assert.equal(stored.length, 1)
  assert.equal(stored[0].witnessedAtTick, 10, "the FIRST witness record wins, never overwritten by a duplicate")
})
