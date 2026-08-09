import assert from "node:assert/strict"
import { test } from "node:test"
import type { SpatialSnapshot } from "@avatark/spatial-ecology-contracts"
import { diffSpatialSnapshot } from "./snapshotDiff.ts"

function patchState(patchId: string, hydrologyCondition: "low" | "moderate" | "high") {
  return { patchId, tick: 0, vegetationCondition: "moderate" as const, hydrologyCondition, resourceAvailability: [], occupancyLevel: "QUIET" as const, presentEntityIds: [], presentGroupIds: [], movementPermeability: 1, ecologicalPressure: 0 }
}

test("diffSpatialSnapshot: a truly unchanged patch state (including its own tick) produces no entry", () => {
  const prev: SpatialSnapshot = { worldId: "world-1", tick: 1, patchStates: [patchState("patch-a", "moderate")], territoryPressures: [], routeStates: [] }
  const next: SpatialSnapshot = { worldId: "world-1", tick: 2, patchStates: [patchState("patch-a", "moderate")], territoryPressures: [], routeStates: [] }
  const delta = diffSpatialSnapshot(prev, next)
  assert.equal(delta.entries.length, 0)
})

test("diffSpatialSnapshot: a changed field produces exactly one entry with before/after", () => {
  const prev: SpatialSnapshot = { worldId: "world-1", tick: 1, patchStates: [patchState("patch-a", "moderate")], territoryPressures: [], routeStates: [] }
  const next: SpatialSnapshot = { worldId: "world-1", tick: 2, patchStates: [{ ...patchState("patch-a", "low"), tick: 2 }], territoryPressures: [], routeStates: [] }
  const delta = diffSpatialSnapshot(prev, next)
  assert.equal(delta.entries.length, 1)
  assert.equal(delta.entries[0].kind, "patch")
  assert.equal(delta.entries[0].id, "patch-a")
  assert.equal((delta.entries[0].before as { hydrologyCondition: string }).hydrologyCondition, "moderate")
  assert.equal((delta.entries[0].after as { hydrologyCondition: string }).hydrologyCondition, "low")
})

test("diffSpatialSnapshot: a patch present before but absent after has an after of null", () => {
  const prev: SpatialSnapshot = { worldId: "world-1", tick: 1, patchStates: [patchState("patch-a", "moderate")], territoryPressures: [], routeStates: [] }
  const next: SpatialSnapshot = { worldId: "world-1", tick: 2, patchStates: [], territoryPressures: [], routeStates: [] }
  const delta = diffSpatialSnapshot(prev, next)
  assert.equal(delta.entries.length, 1)
  assert.equal(delta.entries[0].after, null)
})

test("diffSpatialSnapshot: fromTick/toTick reflect the two snapshots' own ticks, never a replay of intermediate ticks", () => {
  const prev: SpatialSnapshot = { worldId: "world-1", tick: 10, patchStates: [], territoryPressures: [], routeStates: [] }
  const next: SpatialSnapshot = { worldId: "world-1", tick: 5000, patchStates: [], territoryPressures: [], routeStates: [] }
  const delta = diffSpatialSnapshot(prev, next)
  assert.equal(delta.fromTick, 10)
  assert.equal(delta.toTick, 5000)
})
