import { test } from "node:test"
import assert from "node:assert/strict"
import { emptyVisitorWorldMemory } from "@avatark/living-systems-contracts"
import {
  InMemoryLivingEntityStateRepository,
  InMemoryProtectedNarrativeStateRepository,
  InMemorySharedWorldStateRepository,
  InMemoryVisitorWorldMemoryRepository,
  InMemoryWorldSystemEventRepository,
} from "./inMemoryRepositories.ts"

test("SharedWorldStateRepository: get on an unknown world returns null, never throws", async () => {
  const repo = new InMemorySharedWorldStateRepository()
  assert.equal(await repo.get("nonexistent-world"), null)
})

test("SharedWorldStateRepository: save then get round-trips, keyed by worldId", async () => {
  const repo = new InMemorySharedWorldStateRepository()
  const state = { worldId: "living-vrindavan", worldVersion: 1, clock: { worldId: "living-vrindavan", tick: 5, paused: false }, season: { currentSeasonId: "vasanta", enteredAtTick: 0 }, environment: { weather: { temperatureBand: "moderate", precipitationBand: "moderate", humidityBand: "moderate" }, hydrology: { hydrologyBand: "moderate", soilMoistureBand: "moderate" }, ecology: { vegetationActivityBand: "high", animalActivityBand: "moderate" } } } as const
  await repo.save(state)
  assert.deepEqual(await repo.get("living-vrindavan"), state)
})

test("LivingEntityStateRepository: entities are scoped per world, list/get/save round-trip correctly", async () => {
  const repo = new InMemoryLivingEntityStateRepository()
  const entity = { id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "dormant", attributes: {}, lastUpdatedTick: 0 }
  await repo.save("living-vrindavan", entity)
  assert.deepEqual(await repo.get("living-vrindavan", "e1"), entity)
  assert.deepEqual(await repo.list("living-vrindavan"), [entity])
  assert.deepEqual(await repo.list("living-forest"), [], "a different world sees no entities")
})

test("VisitorWorldMemoryRepository: two different users in the same world never see each other's memory", async () => {
  const repo = new InMemoryVisitorWorldMemoryRepository()
  const memoryA = { ...emptyVisitorWorldMemory("user-a", "living-vrindavan"), lastLocationId: "yamuna" }
  const memoryB = { ...emptyVisitorWorldMemory("user-b", "living-vrindavan"), lastLocationId: "kadamba-grove" }
  await repo.save(memoryA)
  await repo.save(memoryB)

  assert.equal((await repo.get("user-a", "living-vrindavan"))?.lastLocationId, "yamuna")
  assert.equal((await repo.get("user-b", "living-vrindavan"))?.lastLocationId, "kadamba-grove")
  assert.equal(await repo.get("user-a", "living-forest"), null, "same user, different world -- no bleed")
})

test("ProtectedNarrativeStateRepository: exposes only get(), defaults to an honestly-unresolved projection", async () => {
  const repo = new InMemoryProtectedNarrativeStateRepository()
  const projection = await repo.get("living-vrindavan")
  assert.equal(projection.resolved, false)
  assert.equal("save" in repo, false, "no write method exists on this repository at all")
})

test("ProtectedNarrativeStateRepository: a seeded projection is returned for the world it was seeded for", async () => {
  const seeded = new Map([["living-vrindavan", { worldId: "living-vrindavan", episodeRef: "ep-1", sceneRef: null, resolved: true }]])
  const repo = new InMemoryProtectedNarrativeStateRepository(seeded)
  assert.equal((await repo.get("living-vrindavan")).resolved, true)
  assert.equal((await repo.get("living-forest")).resolved, false)
})

test("WorldSystemEventRepository: append/list round-trips, scoped per world, in insertion order", async () => {
  const repo = new InMemoryWorldSystemEventRepository()
  await repo.append({ type: "clock.advanced", worldId: "living-vrindavan", tick: 1, detail: {}, at: "t1" })
  await repo.append({ type: "season.transitioned", worldId: "living-vrindavan", tick: 4, detail: { from: "vasanta", to: "grishma" }, at: "t2" })
  const events = await repo.list("living-vrindavan")
  assert.equal(events.length, 2)
  assert.equal(events[0].type, "clock.advanced")
  assert.equal(events[1].type, "season.transitioned")
  assert.deepEqual(await repo.list("living-forest"), [])
})
