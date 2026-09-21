import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import {
  artifactReferenceFromCanonical,
  disconfirmationCountFromConfirmationSequence,
  evaluateExpectation,
  expectationReferenceFromCanonical,
} from "@avatark/narrative-ir-adapter"
import type { CanonicalExpectedPatternState, ExpectationEvaluationContext, ExpectedAbsenceFact } from "@avatark/narrative-ir-adapter"
import { evidenceItemFromExpectedAbsenceFact } from "./worldEvidence.ts"
import {
  CERTIFICATION_AUTHORITY_IDENTITY,
  CERTIFICATION_POLICY_IDENTITY,
  certifyInterpretationCandidate,
  interpretNarrativeEvidence,
} from "./index.ts"
import type { InterpreterIdentity, NarrativeInterpretationInput } from "./types.ts"

const IDENTITY: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }

// The fixture's own placeholder digest ("test-fixture-digest-not-canonical")
// is not well-formed 64-hex SHA-256 -- correctly refused by certification's
// format policy (see D14 below, which tests exactly that). Most tests in
// this file are not about digest format, so they use this well-formed but
// explicitly non-canonical placeholder instead. It is never claimed to be a
// real compiler digest -- see D22 for the actual real-digest proof.
const WELL_FORMED_TEST_DIGEST = "0".repeat(64)

const fixturePath = fileURLToPath(new URL("../test/fixtures/bh-e002-expected-absence-canonical-fragment.json", import.meta.url))
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
  fixtureId: string
  digest: string
  documents: Record<string, unknown>
  subjectId: string
  property: string
}

// Same real, unmodified adapter pipeline worldEvidence.test.ts uses.
function realExpectedAbsenceFact(overrides?: { digest?: string; confirmationSequence?: readonly ("CONFIRMED" | "DISCONFIRMED")[] }): ExpectedAbsenceFact {
  const placeMemory = fixture.documents["place-memory/waiting-hollow"] as { placeId: string; expectedPatternState: CanonicalExpectedPatternState }
  const runtimeRequirementsDoc = fixture.documents["runtime-requirements/occupancy-pattern"] as { id: string; requires: readonly string[] }
  const eps: CanonicalExpectedPatternState = overrides?.confirmationSequence
    ? { ...placeMemory.expectedPatternState, confirmationSequence: overrides.confirmationSequence }
    : placeMemory.expectedPatternState

  const artifactReference = artifactReferenceFromCanonical(
    { fixtureId: fixture.fixtureId, digest: overrides?.digest ?? WELL_FORMED_TEST_DIGEST },
    runtimeRequirementsDoc,
    placeMemory.placeId,
  )
  const expectation = expectationReferenceFromCanonical(eps, {
    expectationId: `expectation-${placeMemory.placeId}`,
    subjectId: fixture.subjectId,
    property: fixture.property,
    artifactReference,
  })
  const disconfirmationCountSoFar = disconfirmationCountFromConfirmationSequence(eps.confirmationSequence.slice(0, -1))
  const context: ExpectationEvaluationContext = {
    observedOutcome: "DEVIATED",
    withinPatternWindow: false,
    evidenceCompleteness: "COMPLETE",
    logicalTick: 10,
    disconfirmationCountSoFar,
  }
  const result = evaluateExpectation(expectation, context)
  assert.equal(result.status, "EXPECTED_ABSENCE")
  if (result.status !== "EXPECTED_ABSENCE") {
    throw new Error("unreachable")
  }
  return result.fact
}

function realInput(overrides?: { digest?: string; confirmationSequence?: readonly ("CONFIRMED" | "DISCONFIRMED")[] }): NarrativeInterpretationInput {
  return { schemaVersion: "1", evidence: [evidenceItemFromExpectedAbsenceFact(realExpectedAbsenceFact(overrides))] }
}

function realCandidate(overrides?: { digest?: string; confirmationSequence?: readonly ("CONFIRMED" | "DISCONFIRMED")[] }) {
  return interpretNarrativeEvidence(realInput(overrides), IDENTITY)
}

// 1 & 2. A valid Phase-C candidate can be certified; the result is explicitly CertifiedInterpretation.
test("D1: a valid real candidate is certified", () => {
  const candidate = realCandidate()
  const result = certifyInterpretationCandidate(candidate, realInput(), IDENTITY)
  assert.equal(result.decision, "CERTIFIED")
})

// 3. Original candidate remains unchanged.
test("D2: certification does not mutate the candidate passed to it", () => {
  const candidate = realCandidate()
  const snapshot = JSON.parse(JSON.stringify(candidate))
  certifyInterpretationCandidate(candidate, realInput(), IDENTITY)
  assert.deepStrictEqual(candidate, snapshot)
})

// 4, 5, 6. Certified artifact references exact candidateId; interpretationInputIdentity and interpreter identity preserved.
test("D3: the certified artifact preserves candidateId, interpretationInputIdentity, and interpreter identity exactly", () => {
  const candidate = realCandidate()
  const result = certifyInterpretationCandidate(candidate, realInput(), IDENTITY)
  assert.equal(result.decision, "CERTIFIED")
  if (result.decision !== "CERTIFIED") throw new Error("unreachable")
  assert.equal(result.certifiedInterpretation.candidateId, candidate.candidateId)
  assert.equal(result.certifiedInterpretation.interpretationInputIdentity, candidate.provenance.interpretationInputIdentity)
  assert.deepStrictEqual(result.certifiedInterpretation.interpreterIdentity, candidate.provenance.interpreterIdentity)
})

// 7 & 8. Source irVersion and source artifact identity/digest preserved.
test("D4: the certified artifact's evidenceProvenance preserves sourceIrVersion and sourceArtifact exactly", () => {
  const candidate = realCandidate()
  const result = certifyInterpretationCandidate(candidate, realInput(), IDENTITY)
  assert.equal(result.decision, "CERTIFIED")
  if (result.decision !== "CERTIFIED") throw new Error("unreachable")
  assert.deepStrictEqual(result.certifiedInterpretation.evidenceProvenance, candidate.provenance.evidenceProvenance)
  assert.ok(result.certifiedInterpretation.evidenceProvenance[0].sourceIrVersion)
  assert.ok(result.certifiedInterpretation.evidenceProvenance[0].sourceArtifact?.digest)
})

// 9 & 10. Certification authority and policy identity/version present.
test("D5: certified artifact names the certification authority and policy that evaluated it", () => {
  const result = certifyInterpretationCandidate(realCandidate(), realInput(), IDENTITY)
  assert.equal(result.decision, "CERTIFIED")
  if (result.decision !== "CERTIFIED") throw new Error("unreachable")
  assert.deepStrictEqual(result.certifiedInterpretation.certificationAuthorityIdentity, CERTIFICATION_AUTHORITY_IDENTITY)
  assert.deepStrictEqual(result.certifiedInterpretation.certificationPolicyIdentity, CERTIFICATION_POLICY_IDENTITY)
})

// 11 & 12. Deterministic certified identity; identical valid candidate under same policy gives the same identity.
test("D6: certifiedInterpretationId is deterministic across repeated certification of the same candidate", () => {
  const candidate = realCandidate()
  const a = certifyInterpretationCandidate(candidate, realInput(), IDENTITY)
  const b = certifyInterpretationCandidate(candidate, realInput(), IDENTITY)
  assert.equal(a.decision, "CERTIFIED")
  assert.equal(b.decision, "CERTIFIED")
  if (a.decision !== "CERTIFIED" || b.decision !== "CERTIFIED") throw new Error("unreachable")
  assert.equal(a.certifiedInterpretation.certifiedInterpretationId, b.certifiedInterpretation.certifiedInterpretationId)
})

test("D7: two independently-derived candidates from identical real evidence produce the same certifiedInterpretationId", () => {
  const candidateA = realCandidate()
  const candidateB = realCandidate()
  const resultA = certifyInterpretationCandidate(candidateA, realInput(), IDENTITY)
  const resultB = certifyInterpretationCandidate(candidateB, realInput(), IDENTITY)
  assert.equal(resultA.decision, "CERTIFIED")
  assert.equal(resultB.decision, "CERTIFIED")
  if (resultA.decision !== "CERTIFIED" || resultB.decision !== "CERTIFIED") throw new Error("unreachable")
  assert.equal(resultA.certifiedInterpretation.certifiedInterpretationId, resultB.certifiedInterpretation.certifiedInterpretationId)
})

// 13. Malformed candidate refused.
test("D8: a structurally malformed candidate is refused, never thrown", () => {
  assert.deepStrictEqual(certifyInterpretationCandidate(null, realInput(), IDENTITY), {
    decision: "REFUSED",
    reason: "INVALID_CANDIDATE",
    detail: "candidate must be an object",
  })
  const missingFields = certifyInterpretationCandidate({ status: "candidate", certified: false }, realInput(), IDENTITY)
  assert.equal(missingFields.decision, "REFUSED")
  if (missingFields.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(missingFields.reason, "INVALID_CANDIDATE")
})

// 14. Candidate with certified=true refused.
test("D9: a candidate whose certified field is not exactly false is refused as ALREADY_CERTIFIED", () => {
  const candidate = realCandidate()
  const tampered = { ...candidate, certified: true }
  const result = certifyInterpretationCandidate(tampered, realInput(), IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "ALREADY_CERTIFIED")
})

// 15. Tampered interpretationInputIdentity refused.
test("D10: a candidate with a tampered interpretationInputIdentity is refused", () => {
  const candidate = realCandidate()
  const tampered = { ...candidate, provenance: { ...candidate.provenance, interpretationInputIdentity: "0".repeat(64) } }
  const result = certifyInterpretationCandidate(tampered, realInput(), IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_INPUT_IDENTITY")
})

// 16. Tampered candidateId refused.
test("D11: a candidate with a tampered candidateId is refused", () => {
  const candidate = realCandidate()
  const tampered = { ...candidate, candidateId: "1".repeat(64) }
  const result = certifyInterpretationCandidate(tampered, realInput(), IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_CANDIDATE_IDENTITY")
})

// 17. Changed evidence content with stale identities refused.
test("D12: a candidate whose stale identities no longer match different (changed) source evidence is refused", () => {
  const staleCandidate = realCandidate()
  const changedInput = realInput({ confirmationSequence: ["CONFIRMED", "DISCONFIRMED"] })
  const result = certifyInterpretationCandidate(staleCandidate, changedInput, IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_INPUT_IDENTITY")
})

// 18. Changed source digest with stale identities refused.
test("D13: a candidate whose stale identities no longer match a different (changed) source digest is refused", () => {
  const staleCandidate = realCandidate()
  const changedInput = realInput({ digest: "a-different-canonical-digest" })
  const result = certifyInterpretationCandidate(staleCandidate, changedInput, IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_INPUT_IDENTITY")
})

// 19. Malformed SHA-256 source digest refused -- a real, self-consistent candidate (interpret-time validation only
// checks digest presence, never format) reaching certification's stricter format policy.
test("D14: a self-consistent candidate carrying a non-hex-64 source digest is refused at the certification format check", () => {
  const input = realInput({ digest: "not-a-real-sha256-digest" })
  const candidate = interpretNarrativeEvidence(input, IDENTITY)
  const result = certifyInterpretationCandidate(candidate, input, IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_SOURCE_DIGEST")
})

// 20. Missing source irVersion for ADAPTED_REAL evidence refused -- reachable only via a hand-crafted candidate
// whose evidenceProvenance no longer matches a fresh recomputation (interpret-time validation already requires
// irVersion presence, so this can never occur in a legitimately-derived candidate -- see this gate's completion
// report on why this surfaces as INVALID_PROVENANCE rather than MISSING_REQUIRED_EVIDENCE here).
test("D15: a candidate whose evidenceProvenance was hand-tampered to drop sourceIrVersion is refused", () => {
  const input = realInput()
  const candidate = interpretNarrativeEvidence(input, IDENTITY)
  const tamperedEntry = { ...candidate.provenance.evidenceProvenance[0] }
  delete (tamperedEntry as Record<string, unknown>).sourceIrVersion
  const tampered = { ...candidate, provenance: { ...candidate.provenance, evidenceProvenance: [tamperedEntry] } }
  const result = certifyInterpretationCandidate(tampered, input, IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_PROVENANCE")
})

// 21. Unsupported source version refused -- a real, self-consistent candidate (interpret-time validation never
// checks irVersion against a supported set) reaching certification's version policy.
test("D16: a self-consistent candidate whose real evidence declares an unsupported irVersion is refused", () => {
  const placeMemory = fixture.documents["place-memory/waiting-hollow"] as { placeId: string; expectedPatternState: CanonicalExpectedPatternState }
  const eps: CanonicalExpectedPatternState = { ...placeMemory.expectedPatternState, irVersion: "9.9.9" }
  const runtimeRequirementsDoc = fixture.documents["runtime-requirements/occupancy-pattern"] as { id: string; requires: readonly string[] }
  const artifactReference = artifactReferenceFromCanonical({ fixtureId: fixture.fixtureId, digest: fixture.digest }, runtimeRequirementsDoc, placeMemory.placeId)
  const expectation = expectationReferenceFromCanonical(eps, {
    expectationId: `expectation-${placeMemory.placeId}`,
    subjectId: fixture.subjectId,
    property: fixture.property,
    artifactReference,
  })
  const disconfirmationCountSoFar = disconfirmationCountFromConfirmationSequence(eps.confirmationSequence.slice(0, -1))
  const evalResult = evaluateExpectation(expectation, { observedOutcome: "DEVIATED", withinPatternWindow: false, evidenceCompleteness: "COMPLETE", logicalTick: 10, disconfirmationCountSoFar })
  assert.equal(evalResult.status, "EXPECTED_ABSENCE")
  if (evalResult.status !== "EXPECTED_ABSENCE") throw new Error("unreachable")

  const input: NarrativeInterpretationInput = { schemaVersion: "1", evidence: [evidenceItemFromExpectedAbsenceFact(evalResult.fact)] }
  const candidate = interpretNarrativeEvidence(input, IDENTITY)
  const result = certifyInterpretationCandidate(candidate, input, IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "UNSUPPORTED_SOURCE_VERSION")
})

// 22. Malformed provenance refused.
test("D17: a candidate whose provenance.evidenceProvenance is not an array is refused", () => {
  const candidate = realCandidate()
  const tampered = { ...candidate, provenance: { ...candidate.provenance, evidenceProvenance: "not-an-array" } }
  const result = certifyInterpretationCandidate(tampered, realInput(), IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "INVALID_CANDIDATE")
})

// 23. Required-but-unavailable evidence refused: a candidate built only from generic, not-yet-integrated evidence has nothing governed to certify.
test("D18: a candidate built only from opaque, not-yet-integrated evidence is refused as missing required evidence", () => {
  const input: NarrativeInterpretationInput = { schemaVersion: "1", evidence: [{ evidenceId: "ev-1", sourceKind: "TEST_FIXTURE", payload: { note: "opaque" } }] }
  const candidate = interpretNarrativeEvidence(input, IDENTITY)
  const result = certifyInterpretationCandidate(candidate, input, IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "MISSING_REQUIRED_EVIDENCE")
})

test("D18b: a candidate built from zero evidence is refused as missing required evidence, never fabricated as certifiable", () => {
  const input: NarrativeInterpretationInput = { schemaVersion: "1", evidence: [] }
  const candidate = interpretNarrativeEvidence(input, IDENTITY)
  const result = certifyInterpretationCandidate(candidate, input, IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.equal(result.reason, "MISSING_REQUIRED_EVIDENCE")
})

// 24. Synthetic evidenceStateIds cannot satisfy authoritative-source validation -- proven by absence: this file never reads that field.
test("D19: certify.ts's own CODE (not its explanatory comments) never references evidenceStateIds -- a synthetic adapter-generated id can never influence certification", () => {
  const codeOnly = readFileSync(fileURLToPath(new URL("./certify.ts", import.meta.url)), "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
  assert.ok(!codeOnly.includes("evidenceStateIds"))
})

// 25. Certification does not mutate input (sourceInput/sourceIdentity, not just the candidate -- see D2 above for the candidate).
test("D20: certification does not mutate the raw source input or interpreter identity passed to it", () => {
  const input = realInput()
  const identity: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }
  const inputSnapshot = JSON.parse(JSON.stringify(input))
  const identitySnapshot = JSON.parse(JSON.stringify(identity))
  certifyInterpretationCandidate(realCandidate(), input, identity)
  assert.deepStrictEqual(input, inputSnapshot)
  assert.deepStrictEqual(identity, identitySnapshot)
})

// 34. Refusal has a stable, machine-readable reason.
test("D21: every refusal carries a reason from the fixed CertificationRefusalReason set", () => {
  const KNOWN_REASONS = [
    "INVALID_CANDIDATE",
    "ALREADY_CERTIFIED",
    "INVALID_INPUT_IDENTITY",
    "INVALID_CANDIDATE_IDENTITY",
    "MISSING_REQUIRED_EVIDENCE",
    "INVALID_SOURCE_DIGEST",
    "UNSUPPORTED_SOURCE_VERSION",
    "INVALID_PROVENANCE",
  ]
  const result = certifyInterpretationCandidate(null, realInput(), IDENTITY)
  assert.equal(result.decision, "REFUSED")
  if (result.decision !== "REFUSED") throw new Error("unreachable")
  assert.ok(KNOWN_REASONS.includes(result.reason))
})

// --- Section 17: real compiler-produced SHA-256 digest reaches certification ---
//
// Reuses G10C-3's already-executed, independently-verified real compiler
// invocation (see that gate's completion report items 20-24) rather than
// re-running the compiler here -- this remains a gate/integration proof,
// never a runtime filesystem dependency on the Lane-1 repository. Proof
// level: C (real compiler invocation), not D (live production service).
const REAL_COMPILER_FIXTURE_ID = "C-repeated-pattern-gap-perceptible-absence"
const REAL_COMPILER_DIGEST = "7a823c5abc98bc21c53f4be3ea7444625ca89b7baa679731ab514ba77d84efba"

test("D22: a candidate carrying a real, compiler-produced SHA-256 digest (proof level C, not the fixture placeholder) is certified", () => {
  const placeMemory = fixture.documents["place-memory/waiting-hollow"] as { placeId: string; expectedPatternState: CanonicalExpectedPatternState }
  const runtimeRequirementsDoc = fixture.documents["runtime-requirements/occupancy-pattern"] as { id: string; requires: readonly string[] }

  const artifactReference = artifactReferenceFromCanonical({ fixtureId: REAL_COMPILER_FIXTURE_ID, digest: REAL_COMPILER_DIGEST }, runtimeRequirementsDoc, placeMemory.placeId)
  assert.notEqual(artifactReference.digest, fixture.digest, "must not be the fixture-placeholder digest")

  const expectation = expectationReferenceFromCanonical(placeMemory.expectedPatternState, {
    expectationId: `expectation-${placeMemory.placeId}`,
    subjectId: fixture.subjectId,
    property: fixture.property,
    artifactReference,
  })
  const disconfirmationCountSoFar = disconfirmationCountFromConfirmationSequence(placeMemory.expectedPatternState.confirmationSequence.slice(0, -1))
  const evalResult = evaluateExpectation(expectation, { observedOutcome: "DEVIATED", withinPatternWindow: false, evidenceCompleteness: "COMPLETE", logicalTick: 10, disconfirmationCountSoFar })
  assert.equal(evalResult.status, "EXPECTED_ABSENCE")
  if (evalResult.status !== "EXPECTED_ABSENCE") throw new Error("unreachable")

  const input: NarrativeInterpretationInput = { schemaVersion: "1", evidence: [evidenceItemFromExpectedAbsenceFact(evalResult.fact)] }
  const candidate = interpretNarrativeEvidence(input, IDENTITY)
  assert.equal(candidate.provenance.evidenceProvenance[0].sourceArtifact?.digest, REAL_COMPILER_DIGEST)

  const result = certifyInterpretationCandidate(candidate, input, IDENTITY)
  assert.equal(result.decision, "CERTIFIED")
  if (result.decision !== "CERTIFIED") throw new Error("unreachable")
  assert.equal(result.certifiedInterpretation.evidenceProvenance[0].sourceArtifact?.digest, REAL_COMPILER_DIGEST)
  // The certifier's own identity is never the source digest, and never presented as source authority.
  assert.notEqual(result.certifiedInterpretation.certifiedInterpretationId, REAL_COMPILER_DIGEST)
})
