import assert from "node:assert/strict"
import { test } from "node:test"
import { InMemoryParticipationRecordRepository } from "./inMemoryRepositories.ts"

function record(overrides: Partial<Parameters<InMemoryParticipationRecordRepository["save"]>[0]> = {}) {
  return {
    id: "p1",
    worldId: "w1",
    userId: "visitor-1",
    ruleId: "rule-1",
    locationId: "loc-1",
    participantEntityIds: [],
    tick: 1,
    encounterRecordId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

test("save then get by (worldId, id) round-trips", async () => {
  const repo = new InMemoryParticipationRecordRepository()
  await repo.save(record())
  const got = await repo.get("w1", "p1")
  assert.ok(got)
  assert.equal(got!.userId, "visitor-1")
})

test("get for a world/id that was never saved returns null, not throws", async () => {
  const repo = new InMemoryParticipationRecordRepository()
  assert.equal(await repo.get("nope", "nope"), null)
})

test("listByUser filters to only that user's records within the world", async () => {
  const repo = new InMemoryParticipationRecordRepository()
  await repo.save(record({ id: "p1", userId: "visitor-1" }))
  await repo.save(record({ id: "p2", userId: "visitor-2" }))
  const forVisitor1 = await repo.listByUser("w1", "visitor-1")
  assert.equal(forVisitor1.length, 1)
  assert.equal(forVisitor1[0].id, "p1")
})

test("worldInstanceId isolation: records saved under one worldId never appear in another world's listByWorld", async () => {
  const repo = new InMemoryParticipationRecordRepository()
  await repo.save(record({ id: "p1", worldId: "world-a" }))
  await repo.save(record({ id: "p2", worldId: "world-b" }))
  assert.deepEqual((await repo.listByWorld("world-a")).map((r) => r.id), ["p1"])
  assert.deepEqual((await repo.listByWorld("world-b")).map((r) => r.id), ["p2"])
})

test("save is an upsert-by-(worldId, id) -- saving the same id twice never duplicates it in listByWorld", async () => {
  const repo = new InMemoryParticipationRecordRepository()
  await repo.save(record({ id: "p1" }))
  await repo.save(record({ id: "p1", tick: 99 }))
  const all = await repo.listByWorld("w1")
  assert.equal(all.length, 1)
  assert.equal(all[0].tick, 99)
})
