import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { adaptVerifiedPhysicalConsequences } from "@avatark/narrative-ir-adapter"
import { interpretNarrativeEvidence } from "./interpret.ts"
import { certifyInterpretationCandidate } from "./certify.ts"
import { EVIDENCE_REQUIREMENT_CLASSIFICATION, NOT_YET_INTEGRATED_EVIDENCE_CLASSES } from "./provenance.ts"
import { MalformedAdaptedEvidenceError, UnsupportedEvidenceKindError } from "./errors.ts"
import { PHYSICAL_CONSEQUENCE_EVIDENCE_KIND, evidenceItemFromPhysicalConsequenceFact } from "./physicalConsequenceEvidence.ts"
import type { InterpreterIdentity, NarrativeEvidenceItem } from "./types.ts"

// Material: the adapter package's copies of compiler output (compiler main
// 0dc671d502cb2600fc4e2e41f5f9c30a2ebfdee9; provenance, blob hashes and the
// test-authored status of ATTR are asserted in
// packages/narrative-ir-adapter/src/physicalConsequenceEvidence.test.ts).
const IDENTITY: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }
const here = path.dirname(fileURLToPath(import.meta.url))
const adapterFixture = (name: string) =>
  readFileSync(path.join(here, "..", "..", "narrative-ir-adapter", "test", "fixtures", name), "utf8")

const GOLDEN_A = {
  artifact: { fixtureId: "A-intervention-delayed-consequence-return-evidence", digest: "19a4135db940267c8bc8c574903b22752024ce16961f1577dbe8cf0dfc764f86" },
  canonicalBytes: adapterFixture("compiler-golden-A-intervention-delayed-consequence-return-evidence.canonical.json"),
}
const ATTR = {
  artifact: { fixtureId: "r3g3-12-physical-consequence-attribution-and-register", digest: "ca3078d464445adf4c0cad5b02b8cd26bdc814b5f47f519cb0f8a560581f4c01" },
  canonicalBytes: adapterFixture("r3g3-12-physical-consequence-attribution-and-register.canonical.json"),
}

function physicalEvidence(input: unknown): NarrativeEvidenceItem[] {
  const result = adaptVerifiedPhysicalConsequences(input)
  assert.equal(result.decision, "ADAPTED", JSON.stringify(result))
  if (result.decision !== "ADAPTED") return []
  return result.physicalConsequences.map(evidenceItemFromPhysicalConsequenceFact)
}
const payloadOf = (item: NarrativeEvidenceItem) => item.payload as Record<string, unknown>
const interpret = (evidence: unknown[]) => interpretNarrativeEvidence({ schemaVersion: "1", evidence }, IDENTITY)

test("PE1: verified PhysicalConsequences become WorldEvidence accepted as ADAPTED_REAL", () => {
  const evidence = physicalEvidence(GOLDEN_A)
  assert.deepEqual(evidence.map((e) => [e.evidenceId, e.sourceKind]), [
    ["consequence/delayed-downstream-improvement", PHYSICAL_CONSEQUENCE_EVIDENCE_KIND],
    ["consequence/immediate-flow-change", PHYSICAL_CONSEQUENCE_EVIDENCE_KIND],
  ])
  const candidate = interpret(evidence)
  assert.deepEqual(candidate.derivedFromEvidenceIds, evidence.map((e) => e.evidenceId))
  assert.ok(candidate.provenance.evidenceProvenance.every((p) => p.integration === "ADAPTED_REAL"))
})

test("PE2: provenance retains the verified source artifact and the Consequence key, with no fabricated ruleId/eventId", () => {
  const candidate = interpret(physicalEvidence(ATTR))
  assert.equal(candidate.provenance.evidenceProvenance.length, 2)
  for (const entry of candidate.provenance.evidenceProvenance) {
    assert.deepEqual(entry.sourceArtifact, { sourceId: ATTR.artifact.fixtureId, digest: ATTR.artifact.digest, canonicalizationVersion: "0.1.0" })
    assert.equal(entry.sourceIrVersion, "0.3.0")
    assert.ok(entry.sourceDocumentKey?.startsWith("consequence/test-"))
    assert.equal(entry.sourceDocumentKey, entry.evidenceId)
    assert.ok(!("ruleId" in entry) && !("eventId" in entry))
  }
})

test("PE3: a candidate built from verified PhysicalConsequences certifies under the unchanged policy, deterministically", () => {
  const input = { schemaVersion: "1", evidence: physicalEvidence(ATTR) }
  const candidate = interpretNarrativeEvidence(input, IDENTITY)
  assert.equal(certifyInterpretationCandidate(candidate, input, IDENTITY).decision, "CERTIFIED")
  for (let i = 0; i < 3; i++) assert.deepEqual(interpret(physicalEvidence(ATTR)), candidate)
})

test("PE4: carrying causalAttribution never connects CAUSAL_ATTRIBUTION or adds a causal claim to the candidate", () => {
  const evidence = [...physicalEvidence(GOLDEN_A), ...physicalEvidence(ATTR)]
  const kinds = evidence.map((e) => (payloadOf(e).causalAttribution as { kind: string }).kind).sort()
  assert.deepEqual(kinds, ["CONSUMER_CAUSED", "CROSS_VISIT_SPAN_CAUSED", "MULTI_CAUSAL", "UNEXPLAINED"])
  const candidate = interpret(evidence)
  assert.ok(candidate.provenance.notYetIntegrated.includes("CAUSAL_ATTRIBUTION"))
  assert.equal(EVIDENCE_REQUIREMENT_CLASSIFICATION.CAUSAL_ATTRIBUTION, "REQUIRED_FOR_CAUSAL_EXPLAINABILITY")
  assert.deepEqual(Object.keys(candidate).sort(), ["candidateId", "certified", "derivedFromEvidenceIds", "provenance", "status"])
  const provenanceJson = JSON.stringify(candidate.provenance.evidenceProvenance)
  for (const causal of ["causalAttribution", "CONSUMER_CAUSED", "MULTI_CAUSAL", "contributingCauses", "cause", "confidence", "rank", "score"]) {
    assert.ok(!provenanceJson.includes(causal), `provenance must not carry ${causal}`)
  }
  const asAttribution = { evidenceId: "x-1", sourceKind: "CAUSAL_ATTRIBUTION", payload: payloadOf(evidence[0]).causalAttribution }
  assert.throws(() => interpret([asAttribution]), UnsupportedEvidenceKindError)
})

test("PE5: the carried causalAttribution is the verified value, and it binds the input identity as data", () => {
  const [first] = physicalEvidence(GOLDEN_A)
  assert.deepEqual(payloadOf(first).causalAttribution, { kind: "CROSS_VISIT_SPAN_CAUSED" })
  const baseline = interpret([first]).provenance.interpretationInputIdentity
  const altered = { ...first, payload: { ...payloadOf(first), causalAttribution: { kind: "UNEXPLAINED" } } }
  assert.notEqual(interpret([altered]).provenance.interpretationInputIdentity, baseline)
})

test("PE6: RELATIONAL and LONGITUDINAL stay refused at the interpretation boundary, and a relabeled register is malformed", () => {
  const [physical] = physicalEvidence(ATTR)
  for (const kind of ["CONSEQUENCE_RELATIONAL", "CONSEQUENCE_LONGITUDINAL", "PERSONAL_VISITOR_HISTORY", "NARRATIVE_RESIDUE"]) {
    assert.throws(() => interpret([{ evidenceId: "x-1", sourceKind: kind, payload: payloadOf(physical) }]), UnsupportedEvidenceKindError, kind)
  }
  for (const register of ["RELATIONAL", "LONGITUDINAL", "SPIRITUAL"]) {
    const relabeled = { ...physical, payload: { ...payloadOf(physical), register } }
    assert.throws(() => interpret([relabeled]), MalformedAdaptedEvidenceError, register)
  }
})

test("PE7: malformed PhysicalConsequence payloads are refused, never reinterpreted", () => {
  const [physical] = physicalEvidence(GOLDEN_A)
  const variants: Array<[string, Record<string, unknown>]> = [
    ["missing causalAttribution", { causalAttribution: undefined }],
    ["causalAttribution without kind", { causalAttribution: {} }],
    ["worldStateDelta not an object", { worldStateDelta: ["cleared"] }],
    ["key outside the consequence family", { consequenceKey: "occurrence/x" }],
    ["missing triggerId", { triggerId: "" }],
    ["persistence without lifetime", { persistence: { authority: "C2_SHARED_EMERGENT" } }],
    ["foreign adapter", { adapterIdentity: { name: "some-other-adapter", version: "1" } }],
    ["no source digest", { source: { fixtureId: GOLDEN_A.artifact.fixtureId, canonicalizationVersion: "0.1.0" } }],
  ]
  for (const [label, patch] of variants) {
    const broken = { ...physical, payload: { ...payloadOf(physical), ...patch } }
    assert.throws(() => interpret([broken]), MalformedAdaptedEvidenceError, label)
  }
})

test("PE8: only CONSEQUENCE_PHYSICAL moved, as optional context; the other registers and causal explainability stay unconnected", () => {
  assert.equal(EVIDENCE_REQUIREMENT_CLASSIFICATION[PHYSICAL_CONSEQUENCE_EVIDENCE_KIND], "OPTIONAL_CONTEXT")
  assert.equal(NOT_YET_INTEGRATED_EVIDENCE_CLASSES.includes(PHYSICAL_CONSEQUENCE_EVIDENCE_KIND), false)
  for (const deferred of ["CONSEQUENCE_RELATIONAL", "CONSEQUENCE_LONGITUDINAL", "PERSONAL_VISITOR_HISTORY"]) {
    assert.equal(EVIDENCE_REQUIREMENT_CLASSIFICATION[deferred], "DEFER_TO_LATER_PHASE", deferred)
  }
  const candidate = interpret(physicalEvidence(GOLDEN_A))
  for (const stillOpen of ["CAUSAL_ATTRIBUTION", "CONSEQUENCE_RELATIONAL", "CONSEQUENCE_LONGITUDINAL", "PERSONAL_VISITOR_HISTORY", "NARRATIVE_RESIDUE"]) {
    assert.ok(candidate.provenance.notYetIntegrated.includes(stillOpen), stillOpen)
  }
})

test("PE9: the carrier source reads nothing but the adapter fact and names no out-of-scope concept", () => {
  const source = readFileSync(path.join(here, "physicalConsequenceEvidence.ts"), "utf8")
  const specifiers = [...source.matchAll(/(?:from\s+|require\()\s*["']([^"']+)["']/g)].map((m) => m[1])
  assert.deepEqual(specifiers.sort(), ["./types.ts", "./worldEvidence.ts", "@avatark/narrative-ir-adapter"])
  const code = source.replace(/\/\/.*$/gm, "")
  for (const term of ["CONSUMER_CAUSED", "MULTI_CAUSAL", "contributingCauses", "CAUSAL_ATTRIBUTION", "PERSONAL_VISITOR_HISTORY", "personalHistoryEntryId", "relationshipChainId", "NarrativeResidue", "causalHistory", "Episode", "WRO", "Date.", "Math.random"]) {
    assert.ok(!code.includes(term), `physicalConsequenceEvidence.ts code must not reference ${term}`)
  }
})
