import { test } from "node:test"
import assert from "node:assert/strict"
import { InMemoryEntityBehaviorStateRepository, InMemoryGroupStateRepository } from "./inMemoryRepositories.ts"
import type { EntityBehaviorState, GroupState } from "@avatark/living-population-contracts"

test("EntityBehaviorState round-trips and stays isolated per world", async () => {
  const repo = new InMemoryEntityBehaviorStateRepository()
  const state: EntityBehaviorState = { worldId: "w1", entityId: "cow-1", needs: [], rhythmPhase: "WAKE", activity: "REMAIN", movementType: "Remain", movementTargetLocationId: null, groupId: null, lastUpdatedTick: 3 }
  await repo.save(state)

  assert.deepEqual(await repo.get("w1", "cow-1"), state)
  assert.equal(await repo.get("w2", "cow-1"), null, "a different world instance never sees another's entities")
  assert.deepEqual(await repo.list("w1"), [state])
})

test("GroupState round-trips and stays isolated per world", async () => {
  const repo = new InMemoryGroupStateRepository()
  const group: GroupState = { worldId: "w1", id: "herd-1", kind: "herd", memberEntityIds: ["cow-1"], locationId: "meadow", targetLocationId: null, cohesion: 1, lastUpdatedTick: 0 }
  await repo.save(group)

  assert.deepEqual(await repo.get("w1", "herd-1"), group)
  assert.equal(await repo.get("w2", "herd-1"), null)
  assert.deepEqual(await repo.list("w1"), [group])
})
