import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { adaptVerifiedCausalHistory, adaptVerifiedWorldHistory } from "@avatark/narrative-ir-adapter"
import { interpretNarrativeEvidence } from "./interpret.ts"
import { certifyInterpretationCandidate } from "./certify.ts"
import { EVIDENCE_REQUIREMENT_CLASSIFICATION, NOT_YET_INTEGRATED_EVIDENCE_CLASSES } from "./provenance.ts"
import { MalformedAdaptedEvidenceError, UnsupportedEvidenceKindError } from "./errors.ts"
import { PLACE_CAUSAL_HISTORY_EVIDENCE_KIND, evidenceItemFromPlaceCausalHistoryReferenceFact } from "./causalHistoryEvidence.ts"
import { OCCURRENCE_EVIDENCE_KIND, evidenceItemFromOccurrenceFact } from "./worldHistoryEvidence.ts"
import type { InterpreterIdentity, NarrativeEvidenceItem } from "./types.ts"

// Material: the adapter package's copies of compiler output (compiler main
// 0dc671d502cb2600fc4e2e41f5f9c30a2ebfdee9; provenance, blob hashes and the
// test-authored status of LOCAL_DUP are asserted in
// packages/narrative-ir-adapter/src/causalHistoryEvidence.test.ts).
const IDENTITY: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }
const here = path.dirname(fileURLToPath(import.meta.url))
const adapterFixture = (name: string) =>
  readFileSync(path.join(here, "..", "..", "narrative-ir-adapter", "test", "fixtures", name), "utf8")

const OPEN_REFS = {
  artifact: { fixtureId: "r05c-open-references-valid", digest: "b44f7116d1de1906fec4b600df9b8bcfcc75232d44596799522ee7eff84acfa7" },
  canonicalBytes: adapterFixture("compiler-compiled-r05c-open-references-valid.canonical.json"),
}
const LOCAL_DUP = {
  artifact: { fixtureId: "r3g3-11-causal-history-local-and-duplicate", digest: "8778ed17973995f076867b303c8fbb0f5b6ce03a88fef5ec8659772d1d70c13c" },
  canonicalBytes: adapterFixture("r3g3-11-causal-history-local-and-duplicate.canonical.json"),
}

function causalHistoryEvidence(input: unknown): NarrativeEvidenceItem[] {
  const result = adaptVerifiedCausalHistory(input)
  assert.equal(result.decision, "ADAPTED", JSON.stringify(result))
  if (result.decision !== "ADAPTED") return []
  return result.causalHistoryReferences.map(evidenceItemFromPlaceCausalHistoryReferenceFact)
}
const payloadOf = (item: NarrativeEvidenceItem) => item.payload as Record<string, unknown>

test("CH1: verified causal-history references become ordered WorldEvidence accepted as ADAPTED_REAL", () => {
  const evidence = causalHistoryEvidence(LOCAL_DUP)
  assert.deepEqual(
    evidence.map((e) => [e.evidenceId, e.sourceKind, payloadOf(e).targetRef, payloadOf(e).referenceFamily]),
    [
      ["place-memory/test-grove#0", PLACE_CAUSAL_HISTORY_EVIDENCE_KIND, "occurrence/test-grove-local-arrival", "OCCURRENCE_REFERENCE"],
      ["place-memory/test-grove#1", PLACE_CAUSAL_HISTORY_EVIDENCE_KIND, "consequence/test-grove-local-clearing", "CONSEQUENCE_REFERENCE"],
      ["place-memory/test-grove#2", PLACE_CAUSAL_HISTORY_EVIDENCE_KIND, "occurrence/test-grove-earlier-visit", "OCCURRENCE_REFERENCE"],
      ["place-memory/test-grove#3", PLACE_CAUSAL_HISTORY_EVIDENCE_KIND, "consequence/test-grove-earlier-change", "CONSEQUENCE_REFERENCE"],
      ["place-memory/test-grove#4", PLACE_CAUSAL_HISTORY_EVIDENCE_KIND, "occurrence/test-grove-local-arrival", "OCCURRENCE_REFERENCE"],
    ],
  )
  const candidate = interpretNarrativeEvidence({ schemaVersion: "1", evidence }, IDENTITY)
  assert.deepEqual(candidate.derivedFromEvidenceIds, evidence.map((e) => e.evidenceId))
  assert.ok(candidate.provenance.evidenceProvenance.every((p) => p.integration === "ADAPTED_REAL"))
})

test("CH2: provenance retains the verified source artifact and the PlaceMemory key, with no fabricated ruleId/eventId", () => {
  const candidate = interpretNarrativeEvidence({ schemaVersion: "1", evidence: causalHistoryEvidence(OPEN_REFS) }, IDENTITY)
  assert.equal(candidate.provenance.evidenceProvenance.length, 2)
  for (const entry of candidate.provenance.evidenceProvenance) {
    assert.deepEqual(entry.sourceArtifact, { sourceId: OPEN_REFS.artifact.fixtureId, digest: OPEN_REFS.artifact.digest })
    assert.equal(entry.sourceIrVersion, "0.3.0")
    assert.equal(entry.sourceDocumentKey, "place-memory/open-shore")
    assert.ok(!("ruleId" in entry) && !("eventId" in entry))
  }
  for (const item of causalHistoryEvidence(OPEN_REFS)) assert.equal(payloadOf(item).placeId, "place/open-shore")
})

test("CH3: open Occurrence and Consequence references survive into WorldEvidence unresolved", () => {
  const evidence = causalHistoryEvidence(OPEN_REFS)
  assert.deepEqual(evidence.map((e) => [payloadOf(e).referenceFamily, payloadOf(e).targetMaterialized]), [
    ["OCCURRENCE_REFERENCE", false],
    ["CONSEQUENCE_REFERENCE", false],
  ])
  assert.doesNotThrow(() => interpretNarrativeEvidence({ schemaVersion: "1", evidence }, IDENTITY))
})

test("CH4: an Occurrence reference and the referenced Occurrence's own evidence are distinct facts side by side", () => {
  const history = adaptVerifiedWorldHistory(LOCAL_DUP)
  assert.equal(history.decision, "ADAPTED")
  if (history.decision !== "ADAPTED") return
  const occurrences = history.occurrences.map(evidenceItemFromOccurrenceFact)
  const references = causalHistoryEvidence(LOCAL_DUP)
  const evidence = [...occurrences, ...references]
  const candidate = interpretNarrativeEvidence({ schemaVersion: "1", evidence }, IDENTITY)
  const kinds = candidate.provenance.evidenceProvenance.map((p) => [p.evidenceId, p.sourceKind])
  assert.deepEqual(kinds.filter(([, k]) => k === OCCURRENCE_EVIDENCE_KIND), [["occurrence/test-grove-local-arrival", OCCURRENCE_EVIDENCE_KIND]])
  assert.equal(kinds.filter(([, k]) => k === PLACE_CAUSAL_HISTORY_EVIDENCE_KIND).length, 5)
  for (const item of references) assert.ok(!("persistence" in payloadOf(item)) && !("observations" in payloadOf(item)))
})

test("CH5: a Consequence reference is not Consequence evidence, and Consequence/CausalAttribution classes stay refused", () => {
  const consequenceRef = causalHistoryEvidence(LOCAL_DUP).find((e) => payloadOf(e).targetRef === "consequence/test-grove-local-clearing")!
  assert.equal(payloadOf(consequenceRef).targetMaterialized, true)
  assert.equal(consequenceRef.sourceKind, PLACE_CAUSAL_HISTORY_EVIDENCE_KIND)
  const json = JSON.stringify(consequenceRef)
  for (const field of ["register", "causalAttribution", "CONSUMER_CAUSED", "worldStateDelta", "triggerId", "evidenceTiming", "persistence", "personalHistoryEntryId", "relationshipChainId"]) {
    assert.ok(!json.includes(field), `reference evidence must not carry ${field}`)
  }
  for (const kind of ["CONSEQUENCE_RELATIONAL", "CONSEQUENCE_LONGITUDINAL", "CAUSAL_ATTRIBUTION", "PERSONAL_VISITOR_HISTORY", "NARRATIVE_RESIDUE"]) {
    const item = { evidenceId: "x-1", sourceKind: kind, payload: payloadOf(consequenceRef) }
    assert.throws(() => interpretNarrativeEvidence({ schemaVersion: "1", evidence: [item] }, IDENTITY), UnsupportedEvidenceKindError, kind)
  }
  const relabeled = { evidenceId: "x-1", sourceKind: "CONSEQUENCE_PHYSICAL", payload: payloadOf(consequenceRef) }
  assert.throws(() => interpretNarrativeEvidence({ schemaVersion: "1", evidence: [relabeled] }, IDENTITY), MalformedAdaptedEvidenceError)
})

test("CH6: malformed causal-history reference payloads are refused, never reinterpreted", () => {
  const [occurrenceRef] = causalHistoryEvidence(LOCAL_DUP)
  const variants: Array<[string, Record<string, unknown>]> = [
    ["family does not match the reference prefix", { referenceFamily: "CONSEQUENCE_REFERENCE" }],
    ["unauthorized family", { referenceFamily: "ACTION_REFERENCE" }],
    ["negative position", { position: -1 }],
    ["fractional position", { position: 1.5 }],
    ["missing materialization fact", { targetMaterialized: undefined }],
    ["foreign adapter", { adapterIdentity: { name: "some-other-adapter", version: "1" } }],
    ["no source digest", { source: { fixtureId: "r3g3-11-causal-history-local-and-duplicate", canonicalizationVersion: "0.1.0" } }],
  ]
  for (const [label, patch] of variants) {
    const broken = { ...occurrenceRef, payload: { ...payloadOf(occurrenceRef), ...patch } }
    assert.throws(() => interpretNarrativeEvidence({ schemaVersion: "1", evidence: [broken] }, IDENTITY), MalformedAdaptedEvidenceError, label)
  }
})

test("CH7: a candidate built from verified causal-history references certifies under the unchanged policy, deterministically", () => {
  const input = { schemaVersion: "1", evidence: causalHistoryEvidence(LOCAL_DUP) }
  const candidate = interpretNarrativeEvidence(input, IDENTITY)
  assert.equal(certifyInterpretationCandidate(candidate, input, IDENTITY).decision, "CERTIFIED")
  for (let i = 0; i < 3; i++) {
    assert.deepEqual(interpretNarrativeEvidence({ schemaVersion: "1", evidence: causalHistoryEvidence(LOCAL_DUP) }, IDENTITY), candidate)
  }
})

test("CH8: only PLACE_MEMORY_CAUSAL_HISTORY moved, as optional context; causal explainability stays unconnected", () => {
  assert.equal(EVIDENCE_REQUIREMENT_CLASSIFICATION[PLACE_CAUSAL_HISTORY_EVIDENCE_KIND], "OPTIONAL_CONTEXT")
  assert.equal(NOT_YET_INTEGRATED_EVIDENCE_CLASSES.includes(PLACE_CAUSAL_HISTORY_EVIDENCE_KIND), false)
  assert.equal(EVIDENCE_REQUIREMENT_CLASSIFICATION.CAUSAL_ATTRIBUTION, "REQUIRED_FOR_CAUSAL_EXPLAINABILITY")
  const candidate = interpretNarrativeEvidence({ schemaVersion: "1", evidence: causalHistoryEvidence(LOCAL_DUP) }, IDENTITY)
  for (const stillOpen of ["CAUSAL_ATTRIBUTION", "CONSEQUENCE_RELATIONAL", "CONSEQUENCE_LONGITUDINAL", "PERSONAL_VISITOR_HISTORY", "NARRATIVE_RESIDUE"]) {
    assert.ok(candidate.provenance.notYetIntegrated.includes(stillOpen), stillOpen)
  }
})

test("CH9: the carrier source reads nothing but the adapter fact and names no out-of-scope concept", () => {
  const source = readFileSync(path.join(here, "causalHistoryEvidence.ts"), "utf8")
  const specifiers = [...source.matchAll(/(?:from\s+|require\()\s*["']([^"']+)["']/g)].map((m) => m[1])
  assert.deepEqual(specifiers.sort(), ["./types.ts", "./worldEvidence.ts", "@avatark/narrative-ir-adapter"])
  const code = source.replace(/\/\/.*$/gm, "")
  for (const term of ["PERSONAL_VISITOR_HISTORY", "NarrativeResidue", "narrative-residue", "causalAttribution", "worldStateDelta", "Episode", "WRO", "Date.", "Math.random"]) {
    assert.ok(!code.includes(term), `causalHistoryEvidence.ts code must not reference ${term}`)
  }
})
