import type { CanonicalVisitTransition } from "../canonicalNarrativeIR.ts"
import type { VisitContext } from "../visitContext.ts"

// Constructs a VisitContext from a canonical VisitTransition
// (schemas/ir/v0/visit-transition.schema.json) -- the ONLY translation this
// gate (R07) adds. Mirrors the schema's own conditional requirement
// (visitOrdinal required iff kind === RETURN) as a runtime check, not just a
// type-level hope, since the canonical document arrives as untyped JSON at
// the real application boundary.
//
// Deliberately produces a bare data value, never a call into
// world-memory-runtime's computeReturnRecognition() -- this package has no
// dependency on that package (see dependencyBoundary.test.ts) and does not
// evaluate anything. The application-layer host service
// (avatark-platform-web's own lib/worldMemory/) is the one that combines
// this value with host-supplied worldId/userId/sinceTick to drive
// return-recognition; see lib/worldMemory/visitTransitionContinuity.ts.
export function visitContextFromCanonical(transition: CanonicalVisitTransition): VisitContext {
  if (transition.kind === "RETURN") {
    if (transition.visitOrdinal === undefined) {
      throw new Error("visitContextFromCanonical: RETURN requires visitOrdinal (schema: visit-transition.schema.json)")
    }
    if (transition.visitOrdinal < 2) {
      throw new Error(`visitContextFromCanonical: visitOrdinal must be >= 2, got ${transition.visitOrdinal}`)
    }
    return {
      kind: "return",
      visitOrdinal: transition.visitOrdinal,
      relationshipDepth: transition.relationshipDepth ?? null,
    }
  }

  // FIRST_ENTRY: schema's own if/then/else forbids visitOrdinal here.
  if (transition.visitOrdinal !== undefined) {
    throw new Error("visitContextFromCanonical: FIRST_ENTRY must not carry visitOrdinal (schema: visit-transition.schema.json)")
  }

  return {
    kind: "first_entry",
    visitOrdinal: null,
    relationshipDepth: transition.relationshipDepth ?? null,
  }
}
