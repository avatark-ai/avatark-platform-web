// R07 -- Return/Revisit Continuity Bridge.
//
//   canonical VisitTransition
//         |
//         v
//   @avatark/narrative-ir-adapter  (visitContextFromCanonical -- pure, no
//         |                          world-memory-runtime dependency)
//         v
//   this file (application-layer host service, THIS boundary)
//         |
//         v
//   getReturnRecognition() (./hostService.ts, unmodified)
//         |
//         v
//   @avatark/world-memory-runtime's computeReturnRecognition()
//         |
//         v
//   recognized returning visitor
//
// This is deliberately NOT:
//   @avatark/narrative-ir-adapter -> @avatark/world-memory-runtime
// (see packages/narrative-ir-adapter/src/dependencyBoundary.test.ts, which
// forbids that import; unmodified by this gate). The application layer is
// the only place these two meet.
//
// Identity: `worldId`/`userId` are the SAME plain host/runtime identity
// contract every existing hostService function in this directory already
// uses (see ./hostService.ts's own getReturnRecognition/wakeWorldWithMemory
// signatures) -- not redesigned here. AvatarK's real product identity/auth
// system (@avatark/identity, lib/identity/) is a separate, higher-level
// concern this bridge does not consume; wiring it in (replacing the plain
// userId string with a verified principal) is documented future work, not
// attempted by this gate.
//
// Chronology: canonical VisitTransition (schemas/ir/v0/visit-transition.schema.json)
// deliberately carries no tick/timestamp of its own -- only `kind` and, for
// RETURN, `visitOrdinal`/`relationshipDepth` (see canonicalNarrativeIR.ts's
// CanonicalVisitTransition comment). The "since when" tick this bridge needs
// to drive getReturnRecognition() is host-supplied continuity framing,
// exactly as narrow as R05's ActionOpportunity.openedAtTick or
// ExpectationReference's host-supplied subjectId/property -- never invented
// here, never a second source of truth for World Memory's own clock.
import type { CanonicalVisitTransition, VisitContext } from "@avatark/narrative-ir-adapter"
import { visitContextFromCanonical } from "@avatark/narrative-ir-adapter"
import type { ReturnRecognition } from "@avatark/world-memory-contracts"
import { getReturnRecognition } from "./hostService.ts"

export type VisitContinuityReason =
  | "first_entry"
  | "return_recognized"
  | "return_claimed_without_continuity_record"

export interface VisitContinuityResult {
  visitContext: VisitContext
  /** True only when a real prior-visit continuity record existed AND
   * getReturnRecognition() was actually invoked against it. */
  recognized: boolean
  reason: VisitContinuityReason
  returnRecognition: ReturnRecognition | null
}

const defaultNow = () => new Date().toISOString()

// Orchestration owned entirely at this layer (Required Proof 4): branches
// on the translated VisitContext's own `kind`, never re-implements or
// second-guesses computeReturnRecognition()'s own logic (Required Proof 3).
//
// `sinceTick`: the host's own record of the tick at which this visitor's
// previous visit last observed the world -- `null` when the host has no
// such record (a genuine first visit, or a claimed RETURN the host cannot
// substantiate). This is deliberately a parameter, not a new persistence
// mechanism invented by this gate -- see REPORT.md "remaining integration
// work" for where a durable per-visitor ledger would plug in.
export async function resolveVisitContinuity(
  worldId: string,
  userId: string,
  transition: CanonicalVisitTransition,
  sinceTick: number | null,
  now: () => string = defaultNow,
): Promise<VisitContinuityResult> {
  const visitContext = visitContextFromCanonical(transition)

  if (visitContext.kind === "first_entry") {
    // Nothing to recognize by construction -- RETURN != FIRST_ENTRY
    // replayed with different data (the canonical schema's own framing).
    // world-memory-runtime is never called here: there is no prior visit
    // for computeReturnRecognition() to compare against.
    return { visitContext, recognized: false, reason: "first_entry", returnRecognition: null }
  }

  if (sinceTick === null) {
    // The canonical narrative signals a RETURN, but the host has no
    // continuity record to substantiate it (e.g. a lost/never-established
    // identity link). An honest NOT_RECOGNIZED outcome -- never fabricated,
    // never silently treated as a first entry.
    return { visitContext, recognized: false, reason: "return_claimed_without_continuity_record", returnRecognition: null }
  }

  const returnRecognition = await getReturnRecognition(worldId, userId, sinceTick, now)
  return { visitContext, recognized: true, reason: "return_recognized", returnRecognition }
}
