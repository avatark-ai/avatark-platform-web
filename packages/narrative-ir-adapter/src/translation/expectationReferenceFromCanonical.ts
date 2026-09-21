import type { ArtifactReference } from "../artifactReference.ts"
import type { PersistenceIntent } from "../actionOpportunity.ts"
import type { ExpectationReference } from "../expectationReference.ts"
import type { CanonicalExpectedPatternState } from "../canonicalNarrativeIR.ts"

// Derives the disconfirmation count as a convenience view over the
// canonical, richer confirmationSequence -- never a second persisted
// authority, per NC-IR-RECONCILE-01's explicit instruction that "the old
// STK-SPEC-007 bare disconfirmation-count semantics must become a derived
// convenience view if still needed, not a second persisted authority."
export function disconfirmationCountFromConfirmationSequence(
  confirmationSequence: readonly ("CONFIRMED" | "DISCONFIRMED")[],
): number {
  return confirmationSequence.filter(entry => entry === "DISCONFIRMED").length
}

export interface CanonicalExpectationContext {
  expectationId: string
  subjectId: string
  property: string
  artifactReference: ArtifactReference
  persistenceIntent?: PersistenceIntent
}

// Constructs an ExpectationReference from a canonical ExpectedPatternState
// (schemas/ir/v0/expected-pattern-state.schema.json) plus host-supplied
// identity framing.
//
// Two genuine, documented shape differences from the pre-migration
// STK-SPEC-007-sourced construction, neither of which changes
// evaluateExpectation()'s own behavior:
//
// 1. `origin` is always WORLD_PATTERN. The canonical schema is explicitly
//    "World-pattern-origin expectation only... Observer-knowledge-origin
//    expectation belongs in PersonalVisitorHistory, never here" -- there is
//    no OBSERVER_KNOWLEDGE-origin ExpectedPatternState to translate from.
//    ExpectationOrigin's OBSERVER_KNOWLEDGE value is retained on the type
//    (evaluateExpectation() never branches on origin, so this is not a
//    breaking narrowing) for a future translation from PersonalVisitorHistory,
//    which is not wired by this gate (out of scope: no PersonalVisitorHistory
//    consumer exists in this package today).
// 2. `patternEvidence` (a list of authored relational-evidence state ids in
//    STK-SPEC-007) has no canonical equivalent -- confirmationSequence
//    carries confirm/disconfirm outcomes, not state-id references.
//    evaluateExpectation() only ever inspects patternEvidence.length (its
//    content is never read) and copies it verbatim into
//    ExpectedAbsenceFact.evidenceStateIds, so a synthetic, deterministic id
//    per confirmationSequence entry preserves the emptiness gate exactly
//    (empty confirmationSequence -> empty patternEvidence -> NOT_APPLICABLE)
//    while being honest that these are synthetic ids, not canonical state
//    references -- documented here rather than silently invented.
export function expectationReferenceFromCanonical(
  expectedPatternState: CanonicalExpectedPatternState,
  ctx: CanonicalExpectationContext,
): ExpectationReference {
  return {
    expectationId: ctx.expectationId,
    subjectId: ctx.subjectId,
    property: ctx.property,
    origin: "WORLD_PATTERN",
    // STK-WO-009 Phase C (G10C-3): carried from the source node, never
    // hard-coded to the current Lane-1 version.
    irVersion: expectedPatternState.irVersion,
    patternEvidence: expectedPatternState.confirmationSequence.map((_, index) => `${ctx.expectationId}-evidence-${index}`),
    artifactReference: ctx.artifactReference,
    persistenceIntent: ctx.persistenceIntent,
  }
}
