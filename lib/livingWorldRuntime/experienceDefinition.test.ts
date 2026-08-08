import { test } from "node:test"
import assert from "node:assert/strict"
import { getLocationExperience, LIVING_VRINDAVAN_EXPERIENCE } from "./experienceDefinition.ts"
import { LIVING_VRINDAVAN_DEFINITION } from "./vrindavanDefinition.ts"

test("experience description carries exactly the same location ids as the world definition", () => {
  const worldIds = new Set(LIVING_VRINDAVAN_DEFINITION.locations.map((l) => l.id))
  const experienceIds = new Set(LIVING_VRINDAVAN_EXPERIENCE.locations.map((l) => l.id))
  assert.deepEqual(experienceIds, worldIds)
})

test("getLocationExperience resolves each of the four authorized locations", () => {
  for (const id of ["vrindavan-entry", "yamuna", "kadamba-grove", "govardhan-path"]) {
    const exp = getLocationExperience(id)
    assert.ok(exp, `expected an experience description for "${id}"`)
  }
})

test("getLocationExperience returns undefined for an unknown location, never throws", () => {
  assert.equal(getLocationExperience("nonexistent-location"), undefined)
})

test("Yamuna is reflection-available, matching its world-definition activity", () => {
  const yamuna = getLocationExperience("yamuna")
  assert.equal(yamuna?.interaction.reflectionAvailable, true)
  assert.ok(LIVING_VRINDAVAN_DEFINITION.activities.some((a) => a.locationId === "yamuna"))
})

test("the three non-reflective locations agree between world and experience descriptions", () => {
  for (const id of ["vrindavan-entry", "kadamba-grove", "govardhan-path"]) {
    const exp = getLocationExperience(id)
    assert.equal(exp?.interaction.reflectionAvailable, false)
    assert.equal(LIVING_VRINDAVAN_DEFINITION.activities.some((a) => a.locationId === id), false)
  }
})

test("every location has a distinct atmosphere.quality -- the four locations are experientially differentiated", () => {
  const qualities = LIVING_VRINDAVAN_EXPERIENCE.locations.map((l) => l.atmosphere.quality)
  assert.equal(new Set(qualities).size, qualities.length)
})

test("provenance names the same Living Vrindavan world id as the companion world definition", () => {
  assert.equal(LIVING_VRINDAVAN_EXPERIENCE.world, LIVING_VRINDAVAN_DEFINITION.id)
})
