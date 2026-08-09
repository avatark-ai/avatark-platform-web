import assert from "node:assert/strict"
import { test } from "node:test"
import type { AdaptationEffect } from "@avatark/world-adaptation-contracts"
import { InMemoryAdaptationPressureRepository, InMemoryAdaptationEffectRepository } from "./inMemoryRepositories.ts"

test("InMemoryAdaptationPressureRepository: get returns null before any save, and the saved value after", async () => {
  const repo = new InMemoryAdaptationPressureRepository()
  assert.equal(await repo.get("w1", "ENTITY", "cow-1", "ENCOUNTER_INVOLVEMENT"), null)
  await repo.save({ worldId: "w1", domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", value: 2, lastUpdatedTick: 10 })
  const stored = await repo.get("w1", "ENTITY", "cow-1", "ENCOUNTER_INVOLVEMENT")
  assert.equal(stored?.value, 2)
})

test("InMemoryAdaptationPressureRepository: isolates by worldId -- the same subjectId/kind in a different world never bleeds through", async () => {
  const repo = new InMemoryAdaptationPressureRepository()
  await repo.save({ worldId: "world-a", domain: "ENTITY", subjectId: "cow-1", kind: "ENCOUNTER_INVOLVEMENT", value: 5, lastUpdatedTick: 10 })
  assert.equal(await repo.get("world-b", "ENTITY", "cow-1", "ENCOUNTER_INVOLVEMENT"), null)
})

const SAMPLE_EFFECT: AdaptationEffect = { id: "effect-1", worldId: "w1", ruleId: "r1", tier: 1, appliedTick: 10, reversible: true, causalReferences: [], domain: "ENTITY", entityId: "cow-1", kind: "RESOURCE_PREFERENCE_BIAS" }

test("InMemoryAdaptationEffectRepository: append is idempotent by id -- appending twice yields one stored effect and a duplicate_ignored second result", async () => {
  const repo = new InMemoryAdaptationEffectRepository()
  const first = await repo.append(SAMPLE_EFFECT)
  const second = await repo.append(SAMPLE_EFFECT)
  assert.equal(first.status, "appended")
  assert.equal(second.status, "duplicate_ignored")
  assert.equal((await repo.listByWorld("w1")).length, 1)
})

test("InMemoryAdaptationEffectRepository: listBySubject filters by both domain and subject id", async () => {
  const repo = new InMemoryAdaptationEffectRepository()
  await repo.append(SAMPLE_EFFECT)
  await repo.append({ ...SAMPLE_EFFECT, id: "effect-2", entityId: "cow-2" })
  const forCow1 = await repo.listBySubject("w1", "ENTITY", "cow-1")
  assert.equal(forCow1.length, 1)
  assert.equal(forCow1[0].id, "effect-1")
})
