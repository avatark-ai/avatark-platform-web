import { test } from "node:test"
import assert from "node:assert/strict"
import { LIVING_VRINDAVAN_ENCOUNTER_RULES, LIVING_VRINDAVAN_ENTITY_ARCHETYPES, LIVING_VRINDAVAN_SEASONS, LIVING_VRINDAVAN_SYSTEMS_PROVENANCE } from "./systemsDefinition.ts"

test("loads exactly the two authorized reference seasons, Vasanta then Grishma", () => {
  assert.equal(LIVING_VRINDAVAN_SEASONS.length, 2)
  assert.deepEqual(LIVING_VRINDAVAN_SEASONS.map((s) => s.id), ["vasanta", "grishma"])
})

test("Vasanta authorizes exactly one legal next season: Grishma", () => {
  const vasanta = LIVING_VRINDAVAN_SEASONS.find((s) => s.id === "vasanta")!
  assert.deepEqual(vasanta.allowedNextSeasonIds, ["grishma"])
})

test("Grishma authorizes no further season -- the reference slice's terminal state", () => {
  const grishma = LIVING_VRINDAVAN_SEASONS.find((s) => s.id === "grishma")!
  assert.deepEqual(grishma.allowedNextSeasonIds, [])
})

test("entity archetypes resolve to real Living Vrindavan locations, never a canonical character", () => {
  assert.equal(LIVING_VRINDAVAN_ENTITY_ARCHETYPES.length, 2)
  const locationIds = LIVING_VRINDAVAN_ENTITY_ARCHETYPES.map((a) => a.locationId)
  assert.ok(locationIds.includes("yamuna"))
  assert.ok(locationIds.includes("kadamba-grove"))
})

test("encounter rules include the narrative-protected rule, unresolved by construction this sprint", () => {
  const gate = LIVING_VRINDAVAN_ENCOUNTER_RULES.find((r) => r.id === "yamuna-narrative-gate")
  assert.ok(gate)
  assert.equal(gate?.category, "narrative-protected")
})

test("provenance traces back to STK-CAN-006 and STK-SPEC-006, not the location-identity Canon batch", () => {
  assert.deepEqual(LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.canonDocIds, ["STK-CAN-006"])
  assert.equal(LIVING_VRINDAVAN_SYSTEMS_PROVENANCE.specId, "STK-SPEC-006")
})
