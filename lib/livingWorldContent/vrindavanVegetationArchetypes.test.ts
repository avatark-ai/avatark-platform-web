import { test } from "node:test"
import assert from "node:assert/strict"
import { VRINDAVAN_VEGETATION_ARCHETYPES } from "./vrindavanVegetationArchetypes.ts"
import { VRINDAVAN_MICROHABITATS } from "./vrindavanMicrohabitats.ts"

test("Build 03: the three new vegetation archetypes are additive, never redefining the Approved riverbank-vegetation archetype", () => {
  const ids = VRINDAVAN_VEGETATION_ARCHETYPES.map((a) => a.id)
  assert.equal(ids.length, 3)
  assert.ok(!ids.includes("riverbank-vegetation"))
  assert.equal(new Set(ids).size, 3, "no duplicate archetype id")
})

test("Build 03: every vegetation archetype's microhabitats are real, known ids", () => {
  const realMicrohabitatIds = new Set(Object.keys(VRINDAVAN_MICROHABITATS))
  for (const archetype of VRINDAVAN_VEGETATION_ARCHETYPES) {
    assert.ok(archetype.microhabitats.length > 0, `${archetype.id} has no microhabitat`)
    for (const microhabitatId of archetype.microhabitats) {
      assert.ok(realMicrohabitatIds.has(microhabitatId), `${archetype.id} references unknown microhabitat ${microhabitatId}`)
    }
  }
})

test("Build 03: density guidance is presentation-only -- no archetype carries a resource tag Kadamba Grove/Entry/Path do not already really afford", () => {
  const realResourceTagsByArchetype: Record<string, string[]> = {
    "vrindavan-vegetation-grove-canopy": ["shelter", "rest"],
    "vrindavan-vegetation-understory": [],
    "vrindavan-vegetation-grass-ground-cover": [],
  }
  for (const archetype of VRINDAVAN_VEGETATION_ARCHETYPES) {
    assert.deepEqual(archetype.resourceTagsBacked, realResourceTagsByArchetype[archetype.id])
  }
})
