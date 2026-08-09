import assert from "node:assert/strict"
import { test } from "node:test"
import type { SpatialEdge } from "@avatark/spatial-ecology-contracts"
import { reachablePatchIds, resolveMovementPermeability } from "./topologyResolution.ts"

test("reachablePatchIds: includes the origin and every patch connected by traversable edges", () => {
  const edges: SpatialEdge[] = [
    { id: "e1", fromPatchId: "a", toPatchId: "b", relation: "CONNECTED_TO", traversable: true },
    { id: "e2", fromPatchId: "b", toPatchId: "c", relation: "CONNECTED_TO", traversable: true },
  ]
  const reachable = reachablePatchIds(edges, "a")
  assert.deepEqual([...reachable].sort(), ["a", "b", "c"])
})

test("reachablePatchIds: a non-traversable BARRIER edge blocks reachability -- geographic adjacency is not enough", () => {
  const edges: SpatialEdge[] = [
    { id: "e1", fromPatchId: "a", toPatchId: "b", relation: "ADJACENT_TO", traversable: false },
  ]
  const reachable = reachablePatchIds(edges, "a")
  assert.deepEqual(reachable, ["a"])
})

test("reachablePatchIds: an authored CORRIDOR reaches a patch that is not the nearest neighbor", () => {
  const edges: SpatialEdge[] = [
    { id: "e1", fromPatchId: "a", toPatchId: "b", relation: "ADJACENT_TO", traversable: false },
    { id: "e2", fromPatchId: "a", toPatchId: "c", relation: "CORRIDOR", traversable: true },
  ]
  const reachable = reachablePatchIds(edges, "a")
  assert.ok(reachable.includes("c"))
  assert.ok(!reachable.includes("b"))
})

test("reachablePatchIds: treats edges as undirected for movement legality", () => {
  const edges: SpatialEdge[] = [{ id: "e1", fromPatchId: "a", toPatchId: "b", relation: "CONNECTED_TO", traversable: true }]
  assert.deepEqual([...reachablePatchIds(edges, "b")].sort(), ["a", "b"])
})

test("resolveMovementPermeability: a patch with no edges is fully permeable", () => {
  assert.equal(resolveMovementPermeability([], "a"), 1)
})

test("resolveMovementPermeability: is the fraction of incident edges that are traversable", () => {
  const edges: SpatialEdge[] = [
    { id: "e1", fromPatchId: "a", toPatchId: "b", relation: "CONNECTED_TO", traversable: true },
    { id: "e2", fromPatchId: "a", toPatchId: "c", relation: "BARRIER", traversable: false },
  ]
  assert.equal(resolveMovementPermeability(edges, "a"), 0.5)
})
