import assert from "node:assert/strict"
import { test } from "node:test"
import type { GroupState } from "@avatark/living-population-contracts"
import { resolveGroupRoutineIntent } from "./groupRoutineResolution.ts"

const GROUP: GroupState = { worldId: "w1", id: "herd-1", kind: "herd", memberEntityIds: ["a", "b"], locationId: "loc-1", targetLocationId: null, cohesion: 1, lastUpdatedTick: 0 }

test("a group with no members resolves to DISPERSE -- nothing to observe", () => {
  assert.equal(resolveGroupRoutineIntent(GROUP, [], 1).intent, "DISPERSE")
})

test("a majority of members resting resolves to REST_TOGETHER", () => {
  assert.equal(resolveGroupRoutineIntent(GROUP, ["REST", "REST", "GRAZE"], 1).intent, "REST_TOGETHER")
})

test("a majority of members socializing resolves to GATHER", () => {
  assert.equal(resolveGroupRoutineIntent(GROUP, ["SOCIALIZE", "SOCIALIZE"], 1).intent, "GATHER")
})

test("a majority of members moving resolves to MOVE_TO_RESOURCE when the group itself has a target, FOLLOW_ROUTE otherwise", () => {
  const withTarget: GroupState = { ...GROUP, targetLocationId: "loc-2" }
  assert.equal(resolveGroupRoutineIntent(withTarget, ["MOVE_TO_RESOURCE", "MOVE_TO_RESOURCE", "GRAZE"], 1).intent, "MOVE_TO_RESOURCE")
  assert.deepEqual(resolveGroupRoutineIntent(withTarget, ["MOVE_TO_RESOURCE", "MOVE_TO_RESOURCE", "GRAZE"], 1).targetLocationId, "loc-2")

  assert.equal(resolveGroupRoutineIntent(GROUP, ["FOLLOW_GROUP", "RETURN_TO_GROUP", "GRAZE"], 1).intent, "FOLLOW_ROUTE")
})

test("no clear majority with low cohesion resolves to DISPERSE", () => {
  const scattered: GroupState = { ...GROUP, cohesion: 0.2 }
  assert.equal(resolveGroupRoutineIntent(scattered, ["GRAZE", "DRINK", "REST"], 1).intent, "DISPERSE")
})

test("no clear majority with high cohesion resolves to OCCUPY_PLACE, at the group's own location", () => {
  const result = resolveGroupRoutineIntent(GROUP, ["GRAZE", "DRINK", "REST"], 1)
  assert.equal(result.intent, "OCCUPY_PLACE")
  assert.equal(result.targetLocationId, GROUP.locationId)
})
