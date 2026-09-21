import assert from "node:assert/strict"
import { test } from "node:test"
import { EVIDENCE_REQUIREMENT_CLASSIFICATION, NOT_YET_INTEGRATED_EVIDENCE_CLASSES } from "./provenance.ts"
import { ADAPTED_EVIDENCE_SOURCE_KIND } from "./worldEvidence.ts"

// STK-WO-009 Phase C (G10C-3): proves the minimum-sufficient-evidence
// matrix (this gate's completion report has the full per-class reasoning)
// is kept in sync with the executable not-yet-integrated list, rather than
// letting the two drift into silent disagreement.
test("every not-yet-integrated evidence class has an explicit requirement classification", () => {
  for (const evidenceClass of NOT_YET_INTEGRATED_EVIDENCE_CLASSES) {
    assert.ok(evidenceClass in EVIDENCE_REQUIREMENT_CLASSIFICATION, `${evidenceClass} is missing a classification`)
  }
})

test("the one connected evidence class is classified, and is not also listed as not-yet-integrated", () => {
  assert.ok(ADAPTED_EVIDENCE_SOURCE_KIND in EVIDENCE_REQUIREMENT_CLASSIFICATION)
  assert.equal(NOT_YET_INTEGRATED_EVIDENCE_CLASSES.includes(ADAPTED_EVIDENCE_SOURCE_KIND), false)
})

test("no evidence class is classified REQUIRED_FOR_CANDIDATE_IDENTITY or REQUIRED_FOR_CANDIDATE_MEANING while still unintegrated -- Phase C must not claim a required class is missing without blocking on it", () => {
  for (const evidenceClass of NOT_YET_INTEGRATED_EVIDENCE_CLASSES) {
    const classification = EVIDENCE_REQUIREMENT_CLASSIFICATION[evidenceClass]
    assert.notEqual(classification, "REQUIRED_FOR_CANDIDATE_IDENTITY")
    assert.notEqual(classification, "REQUIRED_FOR_CANDIDATE_MEANING")
  }
})
