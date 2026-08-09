import assert from "node:assert/strict"
import { test } from "node:test"
import { InMemoryPrivateReflectionRepository } from "./inMemoryRepository.ts"

function record(overrides: Partial<{ id: string; worldId: string; userId: string; locationId: string; reflectionId: string; content: string; createdAt: string }> = {}) {
  return { id: "r1", worldId: "w1", userId: "visitor-1", locationId: "yamuna", reflectionId: "living-vrindavan#yamuna", content: "a private thought", createdAt: "2026-01-01T00:00:00.000Z", ...overrides }
}

test("append then listByOwner returns only that owner's records", async () => {
  const repo = new InMemoryPrivateReflectionRepository()
  await repo.append(record({ id: "r1", userId: "visitor-1", content: "mine" }))
  await repo.append(record({ id: "r2", userId: "visitor-2", content: "theirs" }))
  const mine = await repo.listByOwner("w1", "visitor-1")
  assert.equal(mine.length, 1)
  assert.equal(mine[0].content, "mine")
})

test("listByOwner for an owner with no records returns an empty array, not null or throws", async () => {
  const repo = new InMemoryPrivateReflectionRepository()
  assert.deepEqual(await repo.listByOwner("w1", "nobody"), [])
})

test("worldInstanceId isolation: the same userId's reflections in two different worlds never mix", async () => {
  const repo = new InMemoryPrivateReflectionRepository()
  await repo.append(record({ id: "r1", worldId: "world-a", content: "in world a" }))
  await repo.append(record({ id: "r2", worldId: "world-b", content: "in world b" }))
  const inA = await repo.listByOwner("world-a", "visitor-1")
  assert.equal(inA.length, 1)
  assert.equal(inA[0].content, "in world a")
})
