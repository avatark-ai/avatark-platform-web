import type { RouteId, SpatialEdgeId } from "./ids.ts"

// A Route names an ordered, authored sequence of topology edges a
// world's own grammar considers a meaningful path (e.g. Living
// Vrindavan's "Govardhan Path" corridor) -- distinct from raw
// reachability (@avatark/spatial-ecology-runtime's own
// `reachablePatchIds`), which only asks "can an entity get there at
// all." A Route is a stronger, authored claim: "this specific sequence
// is a recognized way through." Static/authored -- versioned with the
// world's own SpatialGrammar, never per-instance state.
export interface RouteDefinition {
  id: RouteId
  name: string
  edgeIds: SpatialEdgeId[]
}

// Dynamic, ALWAYS DERIVED (no repository) from the current traversability
// of every edge the route names -- the same "never a second causal
// engine" discipline PatchState already holds. A route is `traversable`
// only when every one of its own edges currently is.
export interface RouteState {
  routeId: RouteId
  tick: number
  traversable: boolean
}
