import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveEntityPresentation } from "./entityPresentationResolver.ts"
import type { EntityArchetype, LivingEntityState } from "@avatark/living-systems-contracts"

const VEGETATION_ARCHETYPE: EntityArchetype = {
  id: "riverbank-vegetation",
  name: "Riverbank Vegetation",
  locationId: "yamuna",
  lifecyclePhases: ["dormant", "budding", "flowering", "seeding"],
  initialLifecyclePhase: "dormant",
}

test("entity identity (entityId) is carried through unchanged", () => {
  const entity: LivingEntityState = { id: "riverbank-vegetation-1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "flowering", attributes: {}, lastUpdatedTick: 4 }
  const presentation = resolveEntityPresentation(entity, VEGETATION_ARCHETYPE)
  assert.equal(presentation.entityId, "riverbank-vegetation-1")
})

test("lifecyclePhase drives both activityHint and animationSemantic", () => {
  const entity: LivingEntityState = { id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "flowering", attributes: {}, lastUpdatedTick: 4 }
  const presentation = resolveEntityPresentation(entity, VEGETATION_ARCHETYPE)
  assert.equal(presentation.activityHint, "flowering")
  assert.equal(presentation.animationSemantic, "flowering")
})

test("presentationArchetype comes from the archetype's own authored name, not the entity's raw archetypeId", () => {
  const entity: LivingEntityState = { id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "dormant", attributes: {}, lastUpdatedTick: 0 }
  const presentation = resolveEntityPresentation(entity, VEGETATION_ARCHETYPE)
  assert.equal(presentation.presentationArchetype, "Riverbank Vegetation")
})

test("two entities differing only by lifecyclePhase produce different presentations, proving state (not just identity) is reflected", () => {
  const dormant = resolveEntityPresentation({ id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "dormant", attributes: {}, lastUpdatedTick: 0 }, VEGETATION_ARCHETYPE)
  const flowering = resolveEntityPresentation({ id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "flowering", attributes: {}, lastUpdatedTick: 3 }, VEGETATION_ARCHETYPE)
  assert.notEqual(dormant.activityHint, flowering.activityHint)
  assert.equal(dormant.entityId, flowering.entityId, "same entity identity throughout")
})
