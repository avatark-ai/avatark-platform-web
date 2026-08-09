import type { PatchId, SpatialEdgeId } from "./ids.ts"

// Sprint 16 Phase 0's own GEOMETRY vs TOPOLOGY vs SEMANTIC PLACE MEANING
// distinction, made concrete: this file is topology ONLY -- no
// coordinates, no distance, no renderer geometry. Two Patches may be
// geographically close but not directly reachable (a BARRIER edge, or
// no edge at all); two Patches may be connected by an authored corridor
// despite not being nearest neighbors. Distance never substitutes for
// an explicit relation.
//
// Deliberately the minimum coherent set needed for the reference proofs
// (Sprint 16 mission: "implement only those required," "do not
// overbuild") -- CONTAINS is already expressed structurally by the
// hierarchy itself (patch.quadrantId, etc.) and needs no separate edge.
export type SpatialRelation = "CONNECTED_TO" | "ADJACENT_TO" | "UPSTREAM_OF" | "DOWNSTREAM_OF" | "CORRIDOR" | "BARRIER"

export interface SpatialEdge {
  id: SpatialEdgeId
  fromPatchId: PatchId
  toPatchId: PatchId
  relation: SpatialRelation
  /** Whether an entity can legally move between these two Patches via
   * this edge right now. A BARRIER edge is typically `false`; every
   * other relation is typically `true`. Reachability (see
   * @avatark/spatial-ecology-runtime's own `reachablePatchIds`) consults
   * ONLY this field, never the `relation` label itself -- the label is
   * semantic metadata for movement weighting/topology queries, not a
   * second reachability rule. */
  traversable: boolean
}
