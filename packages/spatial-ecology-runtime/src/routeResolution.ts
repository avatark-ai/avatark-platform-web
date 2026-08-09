import type { RouteDefinition, RouteState, SpatialEdge } from "@avatark/spatial-ecology-contracts"

// Always derived, never persisted -- a route is traversable only when
// every edge it names currently is (Sprint 16 Phase 0's own
// "derive, never re-simulate" discipline, applied to Route the same
// way it already applies to Patch).
export function resolveRouteState(route: RouteDefinition, edges: SpatialEdge[], tick: number): RouteState {
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]))
  const traversable = route.edgeIds.every((edgeId) => edgeById.get(edgeId)?.traversable === true)
  return { routeId: route.id, tick, traversable }
}
