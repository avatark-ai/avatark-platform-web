import { test } from "node:test"
import assert from "node:assert/strict"
import {
  NOTIFICATION_PREFERENCE_CATEGORIES,
  NOTIFICATION_PREFERENCE_CATEGORY_REGISTRY,
  isDisableableCategory,
} from "./preferenceCategories.ts"

test("all 9 mission-required categories are present, in order, no duplicates", () => {
  const expected = [
    "security_account",
    "invitations",
    "practices_reflections",
    "events",
    "publishing_collaboration",
    "recognition",
    "product_announcements",
    "research_participation",
    "care_physiological_alerts",
  ]
  assert.deepEqual(NOTIFICATION_PREFERENCE_CATEGORIES, expected)
  assert.equal(new Set(NOTIFICATION_PREFERENCE_CATEGORIES).size, expected.length)
})

test("security_account is the only mandatory (non-disableable) category", () => {
  const mandatory = NOTIFICATION_PREFERENCE_CATEGORY_REGISTRY.filter((d) => d.mandatory)
  assert.deepEqual(mandatory.map((d) => d.category), ["security_account"])
  assert.equal(isDisableableCategory("security_account"), false)
  assert.equal(isDisableableCategory("invitations"), true)
  assert.equal(isDisableableCategory("recognition"), true)
})

test("only care_physiological_alerts requires an explicit product policy", () => {
  const gated = NOTIFICATION_PREFERENCE_CATEGORY_REGISTRY.filter((d) => d.requiresExplicitProductPolicy)
  assert.deepEqual(gated.map((d) => d.category), ["care_physiological_alerts"])
})

test("registry has exactly one descriptor per category, no gaps", () => {
  assert.equal(NOTIFICATION_PREFERENCE_CATEGORY_REGISTRY.length, NOTIFICATION_PREFERENCE_CATEGORIES.length)
  for (const category of NOTIFICATION_PREFERENCE_CATEGORIES) {
    const matches = NOTIFICATION_PREFERENCE_CATEGORY_REGISTRY.filter((d) => d.category === category)
    assert.equal(matches.length, 1, `expected exactly one descriptor for ${category}`)
  }
})
