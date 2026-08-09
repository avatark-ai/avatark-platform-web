import assert from "node:assert/strict"
import { test } from "node:test"
import type { RouteDefinition, SpatialEdge } from "@avatark/spatial-ecology-contracts"
import { resolveRouteState } from "./routeResolution.ts"

const ROUTE: RouteDefinition = { id: "route-1", name: "Test Corridor", edgeIds: ["e1", "e2"] }

test("resolveRouteState: traversable only when every one of its own edges currently is", () => {
  const edges: SpatialEdge[] = [
    { id: "e1", fromPatchId: "a", toPatchId: "b", relation: "CORRIDOR", traversable: true },
    { id: "e2", fromPatchId: "b", toPatchId: "c", relation: "CORRIDOR", traversable: true },
  ]
  assert.equal(resolveRouteState(ROUTE, edges, 5).traversable, true)
})

test("resolveRouteState: a single blocked edge along the route makes the whole route non-traversable", () => {
  const edges: SpatialEdge[] = [
    { id: "e1", fromPatchId: "a", toPatchId: "b", relation: "CORRIDOR", traversable: true },
    { id: "e2", fromPatchId: "b", toPatchId: "c", relation: "BARRIER", traversable: false },
  ]
  assert.equal(resolveRouteState(ROUTE, edges, 5).traversable, false)
})
