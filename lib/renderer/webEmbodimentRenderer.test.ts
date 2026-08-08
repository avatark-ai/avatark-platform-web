import { test } from "node:test"
import assert from "node:assert/strict"
import { labelizeActivityHint, labelizeInteractionAffordance, summarizeEnvironmentPresentation } from "./webEmbodimentRenderer.ts"

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
