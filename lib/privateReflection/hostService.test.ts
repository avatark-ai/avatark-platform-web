import { test } from "node:test"
import assert from "node:assert/strict"
import { recordPrivateReflection, getPrivateReflections } from "./hostService.ts"

const FIXED_NOW = () => "2026-08-09T00:00:00.000Z"

test("recordPrivateReflection persists the visitor's own content, readable back only by that same owner", async () => {
  const record = await recordPrivateReflection("living-vrindavan", "visitor-1", "yamuna", "living-vrindavan#yamuna", "a private thought", FIXED_NOW)
  assert.equal(record.content, "a private thought")
  const mine = await getPrivateReflections("living-vrindavan", "visitor-1")
  assert.equal(mine.length, 1)
  assert.equal(mine[0].id, record.id)
})

test("two reflections at the identical location by the identical visitor are both kept -- not content-derived-idempotent by design", async () => {
  const worldId = "private-reflection-host-test-two-reflections"
  await recordPrivateReflection(worldId, "visitor-1", "yamuna", "r1", "first thought", FIXED_NOW)
  await recordPrivateReflection(worldId, "visitor-1", "yamuna", "r1", "second, different thought", FIXED_NOW)
  const mine = await getPrivateReflections(worldId, "visitor-1")
  assert.equal(mine.length, 2)
})

test("private reflection firewall: one visitor's content is never returned when reading another visitor's own reflections", async () => {
  const worldId = "private-reflection-host-test-firewall"
  await recordPrivateReflection(worldId, "visitor-a", "yamuna", "r1", "visitor a's private thought", FIXED_NOW)
  await recordPrivateReflection(worldId, "visitor-b", "yamuna", "r1", "visitor b's private thought", FIXED_NOW)
  const forA = await getPrivateReflections(worldId, "visitor-a")
  assert.equal(forA.length, 1)
  assert.equal(forA[0].content, "visitor a's private thought")
})
