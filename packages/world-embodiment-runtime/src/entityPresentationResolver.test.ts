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

test("without an extra param, movementSemantic/movementTargetLocationId/groupId all default to null -- unchanged vegetation-roster behavior", () => {
  const entity: LivingEntityState = { id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "dormant", attributes: {}, lastUpdatedTick: 0 }
  const presentation = resolveEntityPresentation(entity, VEGETATION_ARCHETYPE)
  assert.equal(presentation.movementSemantic, null)
  assert.equal(presentation.movementTargetLocationId, null)
  assert.equal(presentation.groupId, null)
})

test("Sprint 10, Phase 15: an entity with population behavior state carries its movement/group semantics through", () => {
  const entity: LivingEntityState = { id: "cow-1", archetypeId: "avatark-population-cow", locationId: "yamuna", lifecyclePhase: "MOVING", attributes: {}, lastUpdatedTick: 4 }
  const presentation = resolveEntityPresentation(entity, { ...VEGETATION_ARCHETYPE, id: "avatark-population-cow", name: "Cow" }, { movementSemantic: "ApproachResource", movementTargetLocationId: "kadamba-grove", groupId: "avatark-population-cow-herd" })
  assert.equal(presentation.movementSemantic, "ApproachResource")
  assert.equal(presentation.movementTargetLocationId, "kadamba-grove")
  assert.equal(presentation.groupId, "avatark-population-cow-herd")
})

test("two entities differing only by lifecyclePhase produce different presentations, proving state (not just identity) is reflected", () => {
  const dormant = resolveEntityPresentation({ id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "dormant", attributes: {}, lastUpdatedTick: 0 }, VEGETATION_ARCHETYPE)
  const flowering = resolveEntityPresentation({ id: "e1", archetypeId: "riverbank-vegetation", locationId: "yamuna", lifecyclePhase: "flowering", attributes: {}, lastUpdatedTick: 3 }, VEGETATION_ARCHETYPE)
  assert.notEqual(dormant.activityHint, flowering.activityHint)
  assert.equal(dormant.entityId, flowering.entityId, "same entity identity throughout")
})
