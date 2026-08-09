import type { PatchId, SpatialEdge } from "@avatark/spatial-ecology-contracts"

// Sprint 16 Phase 0 architecture, section 6: reachability is a BFS over
// traversable edges only, treated as undirected for movement legality --
// the same convention Sprint 10's own `buildUndirectedLocationGraph`/
// `reachableNeighbors` already hold for the flat LocationId graph. A
// `relation` label (UPSTREAM_OF, CORRIDOR, ...) is semantic metadata,
// never consulted here -- ONLY `traversable` gates reachability. A
// non-traversable BARRIER edge between two geographically adjacent
// Patches correctly makes them unreachable from each other even though
// an edge exists.
export function reachablePatchIds(edges: SpatialEdge[], fromPatchId: PatchId): PatchId[] {
  const adjacency = new Map<PatchId, PatchId[]>()
  for (const edge of edges) {
    if (!edge.traversable) continue
    if (!adjacency.has(edge.fromPatchId)) adjacency.set(edge.fromPatchId, [])
    if (!adjacency.has(edge.toPatchId)) adjacency.set(edge.toPatchId, [])
    adjacency.get(edge.fromPatchId)!.push(edge.toPatchId)
    adjacency.get(edge.toPatchId)!.push(edge.fromPatchId)
  }

  const visited = new Set<PatchId>([fromPatchId])
  const queue: PatchId[] = [fromPatchId]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const neighbor of adjacency.get(current) ?? []) {
      if (visited.has(neighbor)) continue
      visited.add(neighbor)
      queue.push(neighbor)
    }
  }

  return [...visited]
}

// A Patch's own permeability -- the fraction of its own incident edges
// that are currently traversable. 1 when the Patch has no edges at all
// (nothing present to block movement), matching PatchState's own
// documented default.
export function resolveMovementPermeability(edges: SpatialEdge[], patchId: PatchId): number {
  const incident = edges.filter((edge) => edge.fromPatchId === patchId || edge.toPatchId === patchId)
  if (incident.length === 0) return 1
  const traversableCount = incident.filter((edge) => edge.traversable).length
  return traversableCount / incident.length
}
