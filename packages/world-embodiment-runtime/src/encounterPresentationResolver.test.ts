import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveEncounterPresentation } from "./encounterPresentationResolver.ts"
import type { AvailableEncounter, EncounterCategory } from "@avatark/living-systems-contracts"

test("every encounter category maps to a distinct, non-empty interaction affordance", () => {
  const categories: EncounterCategory[] = ["ambient", "environmental", "reflective", "narrative-protected", "practice-linked"]
  const affordances = categories.map((category) => resolveEncounterPresentation({ ruleId: "r", locationId: "yamuna", category }).interactionAffordance)
  assert.ok(affordances.every((a) => a.length > 0))
  assert.equal(new Set(affordances).size, categories.length, "every category gets its own affordance, none collide")
})

test("ruleId and locationId are carried through unchanged from the authoritative AvailableEncounter", () => {
  const encounter: AvailableEncounter = { ruleId: "yamuna-flowering-reflection", locationId: "yamuna", category: "environmental" }
  const presentation = resolveEncounterPresentation(encounter)
  assert.equal(presentation.ruleId, "yamuna-flowering-reflection")
  assert.equal(presentation.locationId, "yamuna")
})
