import assert from "node:assert/strict"
import { test } from "node:test"
import {
  InMemoryFamiliarityRepository,
  InMemoryGroupMembershipRepository,
  InMemoryHomeRangeRepository,
  InMemoryRelationshipRepository,
  InMemorySeparationRepository,
} from "./inMemoryRepositories.ts"

test("InMemoryRelationshipRepository: save-then-get round-trips, listByEntity/listByType filter correctly, worlds are isolated", async () => {
  const repo = new InMemoryRelationshipRepository()
  const relA = { id: "rel-1", worldId: "world-1", entityAId: "cow-a", entityBId: "cow-b", relationshipType: "PARENT_OFFSPRING" as const, band: "WEAK" as const, evidence: { coPresenceTicks: 0, sharedGroupTicks: 0, reunionCount: 0 }, establishedTick: 0, lastRelevantTick: 0 }
  const relB = { id: "rel-2", worldId: "world-1", entityAId: "cow-b", entityBId: "cow-c", relationshipType: "GROUP_MEMBER" as const, band: "WEAK" as const, evidence: { coPresenceTicks: 0, sharedGroupTicks: 0, reunionCount: 0 }, establishedTick: 0, lastRelevantTick: 0 }
  const relOtherWorld = { id: "rel-1", worldId: "world-2", entityAId: "cow-a", entityBId: "cow-b", relationshipType: "PARENT_OFFSPRING" as const, band: "WEAK" as const, evidence: { coPresenceTicks: 0, sharedGroupTicks: 0, reunionCount: 0 }, establishedTick: 0, lastRelevantTick: 0 }
  await repo.save(relA)
  await repo.save(relB)
  await repo.save(relOtherWorld)

  assert.deepEqual(await repo.get("world-1", "rel-1"), relA)
  assert.equal(await repo.get("world-1", "rel-999"), null)

  const byCowB = await repo.listByEntity("world-1", "cow-b")
  assert.deepEqual(new Set(byCowB.map((r) => r.id)), new Set(["rel-1", "rel-2"]))

  const byType = await repo.listByType("world-1", "PARENT_OFFSPRING")
  assert.deepEqual(byType.map((r) => r.id), ["rel-1"])

  assert.deepEqual(await repo.listByEntity("world-2", "cow-a"), [relOtherWorld])
})

test("InMemoryRelationshipRepository: re-saving the same id upserts rather than duplicates", async () => {
  const repo = new InMemoryRelationshipRepository()
  const rel = { id: "rel-1", worldId: "world-1", entityAId: "cow-a", entityBId: "cow-b", relationshipType: "PARENT_OFFSPRING" as const, band: "WEAK" as const, evidence: { coPresenceTicks: 0, sharedGroupTicks: 0, reunionCount: 0 }, establishedTick: 0, lastRelevantTick: 0 }
  await repo.save(rel)
  await repo.save({ ...rel, band: "STRONG" as const })
  const all = await repo.listByEntity("world-1", "cow-a")
  assert.equal(all.length, 1)
  assert.equal(all[0].band, "STRONG")
})

test("InMemoryGroupMembershipRepository: listByGroup and listByEntity filter independently", async () => {
  const repo = new InMemoryGroupMembershipRepository()
  await repo.save({ id: "m-1", worldId: "world-1", groupId: "group-1", entityId: "cow-a", role: "MEMBER", status: "ACTIVE", establishedTick: 0, leftTick: null })
  await repo.save({ id: "m-2", worldId: "world-1", groupId: "group-1", entityId: "cow-b", role: "MEMBER", status: "ACTIVE", establishedTick: 0, leftTick: null })
  await repo.save({ id: "m-3", worldId: "world-1", groupId: "group-2", entityId: "cow-a", role: "MEMBER", status: "ACTIVE", establishedTick: 0, leftTick: null })

  const group1 = await repo.listByGroup("world-1", "group-1")
  assert.deepEqual(new Set(group1.map((m) => m.entityId)), new Set(["cow-a", "cow-b"]))

  const cowA = await repo.listByEntity("world-1", "cow-a")
  assert.deepEqual(new Set(cowA.map((m) => m.groupId)), new Set(["group-1", "group-2"]))
})

test("InMemoryFamiliarityRepository: get is symmetric regardless of argument order (normalized key)", async () => {
  const repo = new InMemoryFamiliarityRepository()
  const state = { worldId: "world-1", entityAId: "cow-a", entityBId: "cow-b", band: "SEEN" as const, evidence: { coPresenceTicks: 1, sharedGroupTicks: 0, encounterCount: 0 }, lastUpdatedTick: 1 }
  await repo.save(state)
  assert.deepEqual(await repo.get("world-1", "cow-a", "cow-b"), state)
  assert.deepEqual(await repo.get("world-1", "cow-b", "cow-a"), state)
})

test("InMemoryFamiliarityRepository: listByEntity finds pairs regardless of which side the entity is stored on", async () => {
  const repo = new InMemoryFamiliarityRepository()
  await repo.save({ worldId: "world-1", entityAId: "cow-a", entityBId: "cow-b", band: "SEEN" as const, evidence: { coPresenceTicks: 1, sharedGroupTicks: 0, encounterCount: 0 }, lastUpdatedTick: 1 })
  const results = await repo.listByEntity("world-1", "cow-b")
  assert.equal(results.length, 1)
})

test("InMemoryHomeRangeRepository: keyed by ownerType+ownerId, isolated across owner types sharing an id", async () => {
  const repo = new InMemoryHomeRangeRepository()
  const entityRange = { id: "hr-1", worldId: "world-1", ownerType: "ENTITY" as const, ownerId: "shared-id", preferredLocationIds: ["loc-1"], establishedTick: 0 }
  const groupRange = { id: "hr-2", worldId: "world-1", ownerType: "GROUP" as const, ownerId: "shared-id", preferredLocationIds: ["loc-2"], establishedTick: 0 }
  await repo.save(entityRange)
  await repo.save(groupRange)
  assert.deepEqual(await repo.get("world-1", "ENTITY", "shared-id"), entityRange)
  assert.deepEqual(await repo.get("world-1", "GROUP", "shared-id"), groupRange)
  assert.equal(await repo.get("world-1", "ENTITY", "missing"), null)
})

test("InMemorySeparationRepository: getActive returns null once resolved, listActiveByEntity only surfaces active records", async () => {
  const repo = new InMemorySeparationRepository()
  const active = { id: "sep-1", worldId: "world-1", subjectType: "RELATIONSHIP" as const, subjectId: "rel-1", entityId: "cow-a", separatedSinceTick: 5, active: true, resolvedAtTick: null }
  await repo.save(active)
  assert.deepEqual(await repo.getActive("world-1", "RELATIONSHIP", "rel-1"), active)
  assert.deepEqual(await repo.listActiveByEntity("world-1", "cow-a"), [active])

  await repo.save({ ...active, active: false, resolvedAtTick: 12 })
  assert.equal(await repo.getActive("world-1", "RELATIONSHIP", "rel-1"), null)
  assert.deepEqual(await repo.listActiveByEntity("world-1", "cow-a"), [])
})
