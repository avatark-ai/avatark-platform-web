// R07 -- Return/Revisit Continuity Bridge.
//
// A runtime-neutral, world-agnostic restatement of a canonical
// VisitTransition (schemas/ir/v0/visit-transition.schema.json), for a host
// service to combine with its own already-existing identity/chronology
// framing (worldId, userId, sinceTick, ...) -- never a replacement for that
// framing. This package produces this value only; it never evaluates
// return-recognition itself (that stays owned by world-memory-runtime's
// own computeReturnRecognition(), outside this package's dependency
// boundary -- see dependencyBoundary.test.ts).
export type VisitKind = "first_entry" | "return"

export interface VisitContext {
  kind: VisitKind
  /** Present only when kind === "return"; mirrors the canonical
   * VisitTransition's own required-when-RETURN visitOrdinal (>= 2). */
  visitOrdinal: number | null
  /** Carried through verbatim from the canonical node's own optional
   * relationshipDepth; never recomputed here. */
  relationshipDepth: number | null
}
