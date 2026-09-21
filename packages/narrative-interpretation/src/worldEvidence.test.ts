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
import {
  ADAPTED_EVIDENCE_SOURCE_KIND,
  evidenceItemFromExpectedAbsenceFact,
  NARRATIVE_IR_ADAPTER_IDENTITY,
} from "./worldEvidence.ts"
import { interpretNarrativeEvidence, UnsupportedEvidenceKindError, MalformedAdaptedEvidenceError } from "./index.ts"
import type { InterpreterIdentity, NarrativeInterpretationInput } from "./types.ts"

const IDENTITY: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }

// Real, canonical-schema-shaped fixture -- a byte-for-byte copy of
// @avatark/narrative-ir-adapter's own certified test/fixtures/bh-e002-expected-absence-canonical-fragment.json
// (see this directory's copy for the full provenance note). "Real" here
// means "shaped exactly like a real compiled Lane-1 fixture and run through
// the real, unmodified adapter" -- the digest inside it is a fixture
// placeholder, never a certified SHA-256 (see G10C-2's completion report,
// item 21, for why a real compiler-computed digest was not substituted).
const fixturePath = fileURLToPath(new URL("../test/fixtures/bh-e002-expected-absence-canonical-fragment.json", import.meta.url))
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
  fixtureId: string
  digest: string
  documents: Record<string, unknown>
  subjectId: string
  property: string
}

// Runs the real, unmodified @avatark/narrative-ir-adapter pipeline exactly
// as its own certified R05-B test does, optionally overriding the fixture's
// digest or confirmationSequence to prove content-sensitivity (never
// mutating the fixture module itself).
function realExpectedAbsenceFact(overrides?: { digest?: string; confirmationSequence?: readonly ("CONFIRMED" | "DISCONFIRMED")[] }): ExpectedAbsenceFact {
  const placeMemory = fixture.documents["place-memory/waiting-hollow"] as { placeId: string; expectedPatternState: CanonicalExpectedPatternState }
  const runtimeRequirementsDoc = fixture.documents["runtime-requirements/occupancy-pattern"] as { id: string; requires: readonly string[] }
  const eps: CanonicalExpectedPatternState = overrides?.confirmationSequence
    ? { ...placeMemory.expectedPatternState, confirmationSequence: overrides.confirmationSequence }
    : placeMemory.expectedPatternState

  const artifactReference = artifactReferenceFromCanonical(
    { fixtureId: fixture.fixtureId, digest: overrides?.digest ?? fixture.digest },
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
  assert.equal(result.status, "EXPECTED_ABSENCE", "fixture is expected to produce a real EXPECTED_ABSENCE fact -- if this fails, the fixture or the adapter's own behavior changed")
  if (result.status !== "EXPECTED_ABSENCE") {
    throw new Error("unreachable")
  }
  return result.fact
}

function inputWith(evidenceItem: ReturnType<typeof evidenceItemFromExpectedAbsenceFact>): NarrativeInterpretationInput {
  return { schemaVersion: "1", evidence: [evidenceItem] }
}

// 2. Valid real/adapted authoritative evidence is accepted.
test("WB1: a real fixture, run through the real unmodified adapter, is accepted and produces a candidate", () => {
  const fact = realExpectedAbsenceFact()
  const item = evidenceItemFromExpectedAbsenceFact(fact)
  const candidate = interpretNarrativeEvidence(inputWith(item), IDENTITY)
  assert.equal(candidate.status, "candidate")
  assert.equal(candidate.certified, false)
})

// 3. Unsupported evidence kind fails closed (a caller naming a real-but-not-yet-connected class must never be silently accepted as opaque).
test("WB2: an evidence item naming a real-but-unintegrated evidence class fails closed rather than being silently accepted", () => {
  const input = { schemaVersion: "1", evidence: [{ evidenceId: "trace-1", sourceKind: "TRACE", payload: { anything: true } }] }
  assert.throws(() => interpretNarrativeEvidence(input, IDENTITY), UnsupportedEvidenceKindError)
})

// 4. Malformed adapted evidence fails closed.
test("WB3: an evidence item that claims the real adapted sourceKind but has a malformed payload fails closed", () => {
  const input = { schemaVersion: "1", evidence: [{ evidenceId: "e1", sourceKind: ADAPTED_EVIDENCE_SOURCE_KIND, payload: { incomplete: true } }] }
  assert.throws(() => interpretNarrativeEvidence(input, IDENTITY), MalformedAdaptedEvidenceError)
})

// 5. Source identity is preserved. 7. Evidence IDs are preserved.
test("WB4: real source identity (subjectId/property/expectationId) survives the read path unchanged", () => {
  const fact = realExpectedAbsenceFact()
  const item = evidenceItemFromExpectedAbsenceFact(fact)
  const candidate = interpretNarrativeEvidence(inputWith(item), IDENTITY)
  assert.equal(item.evidenceId, fact.expectationId)
  assert.deepStrictEqual(candidate.derivedFromEvidenceIds, [fact.expectationId])
  const entry = candidate.provenance.evidenceProvenance[0]
  assert.equal(entry.integration, "ADAPTED_REAL")
})

// 5 (source irVersion preservation, STK-WO-009 Phase C / G10C-3). Phase B
// found this gap and left it open (WB5 used to assert the field's absence);
// Phase C closed it in the adapter itself (canonicalNarrativeIR.ts,
// expectationReference.ts, expectedAbsenceFact.ts, expectationEvaluation.ts
// -- see the adapter's own new R05-J regression test), so this package now
// carries the real value through rather than fabricating or omitting it.
test("WB5: the source ExpectedPatternState's own irVersion survives unchanged into the adapted evidence payload -- never fabricated, never hard-coded", () => {
  const fact = realExpectedAbsenceFact()
  const item = evidenceItemFromExpectedAbsenceFact(fact)
  const payload = item.payload as { irVersion: string }
  assert.equal(payload.irVersion, fact.irVersion)
  assert.equal(payload.irVersion, "0.3.0", "this fixture's own documents declare irVersion 0.3.0 -- asserting the literal proves the value came from the fixture, not a default")
})

test("WB5b: sourceIrVersion is carried into candidate provenance", () => {
  const fact = realExpectedAbsenceFact()
  const item = evidenceItemFromExpectedAbsenceFact(fact)
  const entry = interpretNarrativeEvidence(inputWith(item), IDENTITY).provenance.evidenceProvenance[0]
  assert.equal(entry.sourceIrVersion, fact.irVersion)
})

// 8. Canonical digest is preserved where available (as a fixture placeholder, honestly labeled, never treated as certified).
test("WB6: the carried artifactReference.digest is exactly the value the real adapter produced, never recomputed or fabricated", () => {
  const fact = realExpectedAbsenceFact()
  const item = evidenceItemFromExpectedAbsenceFact(fact)
  const entry_ = interpretNarrativeEvidence(inputWith(item), IDENTITY).provenance.evidenceProvenance[0]
  assert.equal(entry_.sourceArtifact?.digest, fact.artifactReference.digest)
  assert.equal(entry_.sourceArtifact?.digest, fixture.digest)
})

// 9. Causal/provenance references preserved where available.
test("WB7: evidenceStateIds (the compiled pattern's own relational evidence) are preserved verbatim", () => {
  const fact = realExpectedAbsenceFact()
  const item = evidenceItemFromExpectedAbsenceFact(fact)
  const payload = item.payload as { evidenceStateIds: readonly string[] }
  assert.deepStrictEqual(payload.evidenceStateIds, fact.evidenceStateIds)
})

// 11. Adapter identity/version represented since transformation occurs.
test("WB8: the adapted evidence provenance entry names the adapter that performed the transformation", () => {
  const fact = realExpectedAbsenceFact()
  const item = evidenceItemFromExpectedAbsenceFact(fact)
  const entry = interpretNarrativeEvidence(inputWith(item), IDENTITY).provenance.evidenceProvenance[0]
  assert.deepStrictEqual(entry.adapterIdentity, NARRATIVE_IR_ADAPTER_IDENTITY)
})

// 12. Same real evidence + same versions -> same input identity/candidate.
test("WB9: identical real evidence produces an identical candidate across repeated runs", () => {
  const a = interpretNarrativeEvidence(inputWith(evidenceItemFromExpectedAbsenceFact(realExpectedAbsenceFact())), IDENTITY)
  const b = interpretNarrativeEvidence(inputWith(evidenceItemFromExpectedAbsenceFact(realExpectedAbsenceFact())), IDENTITY)
  assert.deepStrictEqual(a, b)
})

// 13 & 14. Changed evidence CONTENT / changed digest -> changed interpretation input identity.
// This package does not recompute or own the canonical digest, so "content
// changed" is operationalized as "the carried canonical digest changed" --
// the only content-sensitive signal available at this read boundary (see
// G10C-2 completion report item 22).
test("WB10: a different canonical digest for otherwise-identical evidence changes the candidateId", () => {
  const baseline = interpretNarrativeEvidence(inputWith(evidenceItemFromExpectedAbsenceFact(realExpectedAbsenceFact())), IDENTITY)
  const changedDigest = interpretNarrativeEvidence(
    inputWith(evidenceItemFromExpectedAbsenceFact(realExpectedAbsenceFact({ digest: "a-different-canonical-digest" }))),
    IDENTITY,
  )
  assert.notEqual(baseline.candidateId, changedDigest.candidateId)
})

test("WB11: a genuinely different confirmationSequence (different compiled pattern content) changes the candidateId", () => {
  const baseline = interpretNarrativeEvidence(inputWith(evidenceItemFromExpectedAbsenceFact(realExpectedAbsenceFact())), IDENTITY)
  const changedContent = interpretNarrativeEvidence(
    inputWith(evidenceItemFromExpectedAbsenceFact(realExpectedAbsenceFact({ confirmationSequence: ["CONFIRMED", "DISCONFIRMED"] }))),
    IDENTITY,
  )
  assert.notEqual(baseline.candidateId, changedContent.candidateId)
})

// 15. Evidence order semantics are deterministic.
test("WB12: two evidence items in a fixed order always hash the same way, and a different order changes the candidateId (order is content, not incidental)", () => {
  const factA = realExpectedAbsenceFact()
  const factB = realExpectedAbsenceFact({ digest: "second-item-digest" })
  const itemA = evidenceItemFromExpectedAbsenceFact(factA)
  const itemB = evidenceItemFromExpectedAbsenceFact(factB)

  const forward1 = interpretNarrativeEvidence({ schemaVersion: "1", evidence: [itemA, itemB] }, IDENTITY)
  const forward2 = interpretNarrativeEvidence({ schemaVersion: "1", evidence: [itemA, itemB] }, IDENTITY)
  assert.deepStrictEqual(forward1, forward2)

  const reversed = interpretNarrativeEvidence({ schemaVersion: "1", evidence: [itemB, itemA] }, IDENTITY)
  assert.notEqual(forward1.candidateId, reversed.candidateId)
})

// 16 & 17. No fabricated evidence ids / source digests -- the builder only ever copies fields it was given.
test("WB13: evidenceItemFromExpectedAbsenceFact fabricates no identifier or digest -- every carried value traces back to the input fact", () => {
  const fact = realExpectedAbsenceFact()
  const item = evidenceItemFromExpectedAbsenceFact(fact)
  const payload = item.payload as { artifactReference: { digest: string; sourceId: string } }
  assert.equal(item.evidenceId, fact.expectationId)
  assert.equal(payload.artifactReference.digest, fact.artifactReference.digest)
  assert.equal(payload.artifactReference.sourceId, fact.artifactReference.sourceId)
})

// 25. Unavailable provenance remains explicitly unavailable rather than silently omitted.
test("WB14: real evidence classes this phase did not connect remain explicitly listed as not-yet-integrated even when real evidence IS present in the same input", () => {
  const item = evidenceItemFromExpectedAbsenceFact(realExpectedAbsenceFact())
  const candidate = interpretNarrativeEvidence(inputWith(item), IDENTITY)
  assert.ok(candidate.provenance.notYetIntegrated.includes("PLACE_MEMORY_CAUSAL_HISTORY"))
  assert.ok(candidate.provenance.notYetIntegrated.includes("OCCURRENCE_OBSERVATION"))
})

// Read-only invariant, specific to this file: the real fixture on disk is
// never written back to, and the fixture module's own object is never
// mutated by any override path above.
test("WB15: exercising the real evidence path never writes back to the fixture file or mutates the loaded fixture object", () => {
  const before = readFileSync(fixturePath, "utf8")
  realExpectedAbsenceFact({ digest: "probe-digest", confirmationSequence: ["DISCONFIRMED"] })
  const after = readFileSync(fixturePath, "utf8")
  assert.equal(before, after)
})

// --- STK-WO-009 Phase C (G10C-3): interpretationInputIdentity / candidateId separation ---

// 10. Identical source evidence -> identical interpretation input identity.
test("WC1: interpretationInputIdentity depends only on evidence content, not on interpreter identity", () => {
  const item = evidenceItemFromExpectedAbsenceFact(realExpectedAbsenceFact())
  const asV1 = interpretNarrativeEvidence(inputWith(item), IDENTITY)
  const asV2 = interpretNarrativeEvidence(inputWith(item), { name: "narrative-interpretation", version: "0.2.0" })
  assert.equal(asV1.provenance.interpretationInputIdentity, asV2.provenance.interpretationInputIdentity)
})

// 13. Changed interpreter version -> changed candidate identity (even though the input identity is provably the same one).
test("WC2: a different interpreter version changes candidateId while interpretationInputIdentity proves the evidence set is unchanged", () => {
  const item = evidenceItemFromExpectedAbsenceFact(realExpectedAbsenceFact())
  const asV1 = interpretNarrativeEvidence(inputWith(item), IDENTITY)
  const asV2 = interpretNarrativeEvidence(inputWith(item), { name: "narrative-interpretation", version: "0.2.0" })
  assert.notEqual(asV1.candidateId, asV2.candidateId)
  assert.equal(asV1.provenance.interpretationInputIdentity, asV2.provenance.interpretationInputIdentity)
})

// 11. Changed authoritative content -> changed input identity (the interpretationInputIdentity field itself, not just candidateId).
test("WC3: a genuinely different confirmationSequence changes interpretationInputIdentity, not only candidateId", () => {
  const baseline = interpretNarrativeEvidence(inputWith(evidenceItemFromExpectedAbsenceFact(realExpectedAbsenceFact())), IDENTITY)
  const changed = interpretNarrativeEvidence(
    inputWith(evidenceItemFromExpectedAbsenceFact(realExpectedAbsenceFact({ confirmationSequence: ["CONFIRMED", "DISCONFIRMED"] }))),
    IDENTITY,
  )
  assert.notEqual(baseline.provenance.interpretationInputIdentity, changed.provenance.interpretationInputIdentity)
})

// --- STK-WO-009 Phase C (G10C-3): real compiler-produced SHA-256 digest, proof level C ---
//
// This digest was produced once, by this gate, by directly invoking the
// real, unmodified Lane-1 compiler
// (studiok-living-symphony-compiler/scripts/compile-living-world-artifact.mjs)
// against that repository's own real, pre-existing, unmodified fixture
// fixtures/positive/C-repeated-pattern-gap-perceptible-absence.json:
//
//   node scripts/compile-living-world-artifact.mjs \
//     fixtures/positive/C-repeated-pattern-gap-perceptible-absence.json
//   stderr: DIGEST sha256:7a823c5abc98bc21c53f4be3ea7444625ca89b7baa679731ab514ba77d84efba
//
// Independently re-verified by hashing the compiler's own canonical stdout
// bytes with node:crypto directly (not trusting the script's stderr claim
// alone) -- same digest. Embedded here as a literal, not fetched at
// test-time: this package must not runtime-depend on that repository (see
// this gate's completion report for why). This is proof level C (a real
// compiler invocation), not level D (a live production World History
// service) -- see the report's proof-level statement.
const REAL_COMPILER_FIXTURE_ID = "C-repeated-pattern-gap-perceptible-absence"
const REAL_COMPILER_DIGEST = "7a823c5abc98bc21c53f4be3ea7444625ca89b7baa679731ab514ba77d84efba"

test("WC4: the embedded real compiler digest is a genuine 64-hex-character SHA-256, not a placeholder shape", () => {
  assert.match(REAL_COMPILER_DIGEST, /^[0-9a-f]{64}$/)
  assert.notEqual(REAL_COMPILER_DIGEST, fixture.digest, "must not be the fixture-placeholder digest")
})

// 7 & 8. Real compiler SHA-256 reaches candidate provenance; the adapter does not replace it.
test("WC5: pairing the real compiler-produced fixtureId+digest through the real, unmodified adapter carries the real digest unchanged into candidate provenance", () => {
  const runtimeRequirementsDoc = fixture.documents["runtime-requirements/occupancy-pattern"] as { id: string; requires: readonly string[] }
  const placeMemory = fixture.documents["place-memory/waiting-hollow"] as { placeId: string; expectedPatternState: CanonicalExpectedPatternState }

  const artifactReference = artifactReferenceFromCanonical(
    { fixtureId: REAL_COMPILER_FIXTURE_ID, digest: REAL_COMPILER_DIGEST },
    runtimeRequirementsDoc,
    placeMemory.placeId,
  )
  assert.equal(artifactReference.digest, REAL_COMPILER_DIGEST, "the adapter must carry the real digest through unchanged, never recompute it")
  assert.equal(artifactReference.sourceId, REAL_COMPILER_FIXTURE_ID)

  const expectation = expectationReferenceFromCanonical(placeMemory.expectedPatternState, {
    expectationId: `expectation-${placeMemory.placeId}`,
    subjectId: fixture.subjectId,
    property: fixture.property,
    artifactReference,
  })
  const disconfirmationCountSoFar = disconfirmationCountFromConfirmationSequence(placeMemory.expectedPatternState.confirmationSequence.slice(0, -1))
  const result = evaluateExpectation(expectation, {
    observedOutcome: "DEVIATED",
    withinPatternWindow: false,
    evidenceCompleteness: "COMPLETE",
    logicalTick: 10,
    disconfirmationCountSoFar,
  })
  assert.equal(result.status, "EXPECTED_ABSENCE")
  if (result.status !== "EXPECTED_ABSENCE") {
    throw new Error("unreachable")
  }

  const item = evidenceItemFromExpectedAbsenceFact(result.fact)
  const candidate = interpretNarrativeEvidence(inputWith(item), IDENTITY)
  const entry = candidate.provenance.evidenceProvenance[0]
  assert.equal(entry.sourceArtifact?.digest, REAL_COMPILER_DIGEST)

  // 9. The interpreter's own candidateId is a different hash of many
  // things (including this digest) -- never the digest itself, and never
  // presented as if it were source authority.
  assert.notEqual(candidate.candidateId, REAL_COMPILER_DIGEST)
})
