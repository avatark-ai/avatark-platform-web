import type { ExpectationReference } from "./expectationReference.ts"
import type { ExpectedAbsenceFact } from "./expectedAbsenceFact.ts"
import type { EvidenceCompleteness } from "./deriveNonActionQualification.ts"

// Reproduces the canonical producer's own observation.outcome vocabulary
// (CONFIRMED/DEVIATED) verbatim, plus an explicit UNOBSERVED sentinel for
// when no observation could be made at all -- never null/undefined, so a
// legitimate absence-of-value domain reading is never ambiguous with "no
// one looked." This is deliberately the narrowest caller-supplied
// discriminant needed; the evaluator never interprets a raw domain value.
export type ObservedOutcome = "CONFIRMED" | "DEVIATED" | "UNOBSERVED"

// Same COMPLETE/INCOMPLETE shape NON_ACTION's evidence window already
// uses -- reused, not redefined, since it is the identical concept.
export type { EvidenceCompleteness }

export interface ExpectationEvaluationContext {
  observedOutcome: ObservedOutcome
  withinPatternWindow: boolean
  evidenceCompleteness: EvidenceCompleteness
  logicalTick: number
  disconfirmationCountSoFar: number
}

export type ExpectationEvaluationResult =
  | { status: "NOT_APPLICABLE"; reason: string }
  | { status: "INCOMPLETE_EVIDENCE"; reason: string }
  | { status: "UNKNOWN"; reason: string }
  | { status: "SATISFIED" }
  | { status: "WITHIN_PATTERN_WINDOW" }
  | { status: "EXPECTED_ABSENCE"; fact: ExpectedAbsenceFact }

// Pure, deterministic: no IO, no wall clock, no hidden state, no random
// identifiers. Same (expectation, context) always yields the same result.
//
// Precedence (each step short-circuits; documented order is load-bearing,
// not incidental -- see NC-IR-02D §33):
//   1. no authored pattern basis      -> NOT_APPLICABLE
//   2. incomplete evidence            -> INCOMPLETE_EVIDENCE
//   3. actual state unobserved        -> UNKNOWN
//   4. actual confirms expectation    -> SATISFIED
//   5. deviation within pattern window -> WITHIN_PATTERN_WINDOW
//   6. deviation outside the window   -> EXPECTED_ABSENCE
export function evaluateExpectation(
  expectation: ExpectationReference,
  context: ExpectationEvaluationContext,
): ExpectationEvaluationResult {
  // 1. Mirrors the canonical compiler validator's own collapse rule
  // (BH-E002 §B6): an expectation with no authored relational evidence can
  // never be distinguished from a subject that was simply never part of
  // any pattern. Defense-in-depth -- a certified artifact should never
  // reach this package with an empty patternEvidence in the first place.
  if (expectation.patternEvidence.length === 0) {
    return {
      status: "NOT_APPLICABLE",
      reason: "expectation has no authored pattern evidence -- collapses to an ordinary absence, not a genuine expectation",
    }
  }

  // 2. An incomplete evidence window is never equivalent to a complete
  // window that happens to contain no deviation.
  if (context.evidenceCompleteness === "INCOMPLETE") {
    return {
      status: "INCOMPLETE_EVIDENCE",
      reason: "evidence window is incomplete or disconnected -- cannot evaluate the expectation",
    }
  }

  // 3. No observation was made at all -- distinct from a confirmed or
  // deviated observation, and never collapsed into either.
  if (context.observedOutcome === "UNOBSERVED") {
    return { status: "UNKNOWN", reason: "actual state could not be observed" }
  }

  // 4. The actual state confirms the expectation.
  if (context.observedOutcome === "CONFIRMED") {
    return { status: "SATISFIED" }
  }

  // 5. A deviation exists, but the current moment is still inside the
  // pattern's own qualifying window (caller-supplied -- never computed
  // from tick arithmetic; see NC-IR-02D §I / §12 of this gate).
  if (context.withinPatternWindow) {
    return { status: "WITHIN_PATTERN_WINDOW" }
  }

  // 6. Deviation, outside the window, complete evidence, authored pattern
  // basis -- qualified. The count is incremented exactly once, here, and
  // only on this branch; the evaluator never persists it and never
  // decides when repetition transforms the expectation into a new normal.
  const fact: ExpectedAbsenceFact = {
    expectationId: expectation.expectationId,
    subjectId: expectation.subjectId,
    property: expectation.property,
    origin: expectation.origin,
    evidenceStateIds: [...expectation.patternEvidence],
    logicalTick: context.logicalTick,
    disconfirmationCount: context.disconfirmationCountSoFar + 1,
    artifactReference: expectation.artifactReference,
    persistenceIntent: expectation.persistenceIntent,
  }
  return { status: "EXPECTED_ABSENCE", fact }
}
