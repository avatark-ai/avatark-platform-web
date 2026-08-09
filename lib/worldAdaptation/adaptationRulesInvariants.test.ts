import { test } from "node:test"
import assert from "node:assert/strict"
import { VRINDAVAN_ADAPTATION_RULES, findAlternateLocationForCategory } from "./vrindavanAdaptationDefinition.ts"

test("VRINDAVAN_ADAPTATION_RULES: every rule's own domain matches its effect template's domain", () => {
  for (const rule of VRINDAVAN_ADAPTATION_RULES) {
    assert.equal(rule.domain, rule.effect.domain, `rule ${rule.id} has domain ${rule.domain} but effect domain ${rule.effect.domain}`)
  }
})

test("VRINDAVAN_ADAPTATION_RULES: every rule id is unique", () => {
  const ids = VRINDAVAN_ADAPTATION_RULES.map((rule) => rule.id)
  assert.equal(new Set(ids).size, ids.length)
})

test("VRINDAVAN_ADAPTATION_RULES: exactly one rule per mission-required demonstration category (A-E), never a universal property-bag effect template", () => {
  assert.equal(VRINDAVAN_ADAPTATION_RULES.length, 5)
  const domains = VRINDAVAN_ADAPTATION_RULES.map((r) => r.domain).sort()
  assert.deepEqual(domains, ["ENTITY", "PLACE", "PLACE", "RELATIONSHIP", "WORLD_POSSIBILITY"])
})

test("findAlternateLocationForCategory: with the REAL current Vrindavan seed, no resource category has a second providing location yet -- an honest, current-grammar-dependent finding, not a defect", () => {
  assert.equal(findAlternateLocationForCategory("yamuna", "water"), null)
  assert.equal(findAlternateLocationForCategory("kadamba-grove", "vegetation"), null)
})

test("findAlternateLocationForCategory: the branching logic itself correctly finds an alternate once a synthetic affordance set actually offers one", () => {
  const synthetic: { locationId: string; resourceTags: ("water" | "vegetation")[] }[] = [
    { locationId: "yamuna", resourceTags: ["water"] },
    { locationId: "kadamba-grove", resourceTags: ["water", "vegetation"] },
  ]
  assert.equal(findAlternateLocationForCategory("yamuna", "water", synthetic), "kadamba-grove")
  assert.equal(findAlternateLocationForCategory("kadamba-grove", "vegetation", synthetic), null)
})
