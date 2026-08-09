import { test } from "node:test"
import assert from "node:assert/strict"
import type { GroupState, MovementIntent } from "@avatark/living-population-contracts"
import type { LivingEntityState } from "@avatark/living-systems-contracts"
import { advanceGroupState } from "./groupDynamics.ts"

function entity(id: string, locationId: string): LivingEntityState {
  return { id, archetypeId: "cow", locationId, lifecyclePhase: "ACTIVE", attributes: {}, lastUpdatedTick: 0 }
}

const GROUP: GroupState = { worldId: "w1", id: "herd-1", kind: "herd", memberEntityIds: ["c1", "c2", "c3"], locationId: "meadow", targetLocationId: null, cohesion: 1, lastUpdatedTick: 0 }

test("cohesion reflects the fraction of members currently at the group's own location", () => {
  const members = [entity("c1", "meadow"), entity("c2", "meadow"), entity("c3", "river")]
  const result = advanceGroupState({ group: GROUP, memberEntities: members, memberMovementIntents: [], tick: 5 })
  assert.equal(result.cohesion, 2 / 3)
})

test("a majority of members individually approaching the same resource sets the group's target location", () => {
  const members = [entity("c1", "meadow"), entity("c2", "meadow"), entity("c3", "meadow")]
  const intents: MovementIntent[] = [
    { entityId: "c1", type: "ApproachResource", targetLocationId: "river" },
    { entityId: "c2", type: "ApproachResource", targetLocationId: "river" },
    { entityId: "c3", type: "Remain", targetLocationId: null },
  ]
  const result = advanceGroupState({ group: GROUP, memberEntities: members, memberMovementIntents: intents, tick: 5 })
  assert.equal(result.targetLocationId, "river")
  assert.equal(result.locationId, "meadow", "the group hasn't arrived yet -- location only updates once a majority is actually there")
})

test("once a majority of members physically arrive at the target, the group relocates and clears its target", () => {
  const movingGroup: GroupState = { ...GROUP, targetLocationId: "river" }
  const members = [entity("c1", "river"), entity("c2", "river"), entity("c3", "meadow")]
  const result = advanceGroupState({ group: movingGroup, memberEntities: members, memberMovementIntents: [], tick: 6 })
  assert.equal(result.locationId, "river")
  assert.equal(result.targetLocationId, null)
})

test("a tie between two equally-voted targets is broken deterministically (alphabetical)", () => {
  const members = [entity("c1", "meadow"), entity("c2", "meadow")]
  const intents: MovementIntent[] = [
    { entityId: "c1", type: "ApproachResource", targetLocationId: "river" },
    { entityId: "c2", type: "ApproachResource", targetLocationId: "grove" },
  ]
  const result = advanceGroupState({ group: GROUP, memberEntities: members, memberMovementIntents: intents, tick: 5 })
  assert.equal(result.targetLocationId, "grove", "alphabetically first target wins a tie, deterministically")
})

test("an empty group has zero cohesion, never NaN or a thrown error", () => {
  const result = advanceGroupState({ group: { ...GROUP, memberEntityIds: [] }, memberEntities: [], memberMovementIntents: [], tick: 5 })
  assert.equal(result.cohesion, 0)
})
