import { test } from "node:test"
import assert from "node:assert/strict"
import { labelizeActivityHint, labelizeInteractionAffordance, summarizeEntityBehavior, summarizeEnvironmentPresentation } from "./webEmbodimentRenderer.ts"

test("summarizeEnvironmentPresentation produces one line covering atmosphere/water/vegetation semantics", () => {
  const line = summarizeEnvironmentPresentation({ atmosphere: { semantic: "contemplative" }, water: { semantic: "still" }, vegetation: { semantic: "moderate-riverbank" } })
  assert.match(line, /Atmosphere: Contemplative/)
  assert.match(line, /Water: Still/)
  assert.match(line, /Vegetation: Moderate Riverbank/)
})

test("labelizeActivityHint and labelizeInteractionAffordance title-case and de-hyphenate", () => {
  assert.equal(labelizeActivityHint("budding"), "Budding")
  assert.equal(labelizeInteractionAffordance("narrative-protected"), "Narrative Protected")
})

test("summarizeEntityBehavior returns null for an entity with no population behavior state (every vegetation-roster entity, unchanged)", () => {
  assert.equal(summarizeEntityBehavior({}), null)
  assert.equal(summarizeEntityBehavior({ movementSemantic: null, groupId: null }), null)
  assert.equal(summarizeEntityBehavior({ movementSemantic: "Remain", groupId: null }), null, "Remain is not worth surfacing as a diagnostic line")
})

test("summarizeEntityBehavior surfaces movement and group when present", () => {
  assert.equal(summarizeEntityBehavior({ movementSemantic: "ApproachResource", groupId: null }), "ApproachResource")
  assert.equal(summarizeEntityBehavior({ movementSemantic: null, groupId: "avatark-population-cow-herd" }), "Group: Avatark Population Cow Herd")
})
