import type { WorldLocationGraph } from "@avatark/living-population-contracts"

export interface DirectedEdge {
  from: string
  to: string
}

// Turns a directed edge list (e.g. a world's own StudioK-authored
// `connections[]`) into an UNDIRECTED adjacency map for entity movement
// legality -- a physical entity walking from A to B has no reason to be
// unable to walk back, unlike a visitor's one-way narrative "unlock"
// graph. Invents no new location or edge; only reinterprets existing
// ones symmetrically.
export function buildUndirectedLocationGraph(edges: DirectedEdge[]): WorldLocationGraph {
  const graph: WorldLocationGraph = {}
  const addEdge = (from: string, to: string) => {
    if (!graph[from]) graph[from] = []
    if (!graph[from].includes(to)) graph[from].push(to)
  }
  for (const edge of edges) {
    addEdge(edge.from, edge.to)
    addEdge(edge.to, edge.from)
  }
  return graph
}

export function reachableNeighbors(graph: WorldLocationGraph, locationId: string): string[] {
  return graph[locationId] ?? []
}
