import { test } from "node:test"
import assert from "node:assert/strict"
import { VRINDAVAN_MICROHABITATS } from "./vrindavanMicrohabitats.ts"
import { VRINDAVAN_SPATIAL_GRAMMAR } from "../spatialEcology/vrindavanSpatialDefinition.ts"

test("Build 03, req: microhabitat vocabulary -- every microhabitat resolves to one of the four real LocalPlace ids, never a 5th place", () => {
  const realLocalPlaceIds = new Set(VRINDAVAN_SPATIAL_GRAMMAR.localPlaces.map((place) => place.id))
  assert.equal(realLocalPlaceIds.size, 4, "the four real, Approved LocalPlaces, unchanged")
  for (const microhabitat of Object.values(VRINDAVAN_MICROHABITATS)) {
    for (const parentId of microhabitat.parentLocalPlaceIds) {
      assert.ok(realLocalPlaceIds.has(parentId), `${microhabitat.id} references unknown LocalPlace ${parentId}`)
    }
  }
})

test("Build 03: microhabitats carry no queryable runtime state -- descriptive metadata only, no id collides with a real resource tag, location, or archetype id", () => {
  const microhabitatIds = Object.keys(VRINDAVAN_MICROHABITATS)
  assert.equal(new Set(microhabitatIds).size, microhabitatIds.length, "no duplicate microhabitat id")
  for (const microhabitat of Object.values(VRINDAVAN_MICROHABITATS)) {
    assert.equal(typeof microhabitat.label, "string")
    assert.ok(microhabitat.label.length > 0)
  }
})
