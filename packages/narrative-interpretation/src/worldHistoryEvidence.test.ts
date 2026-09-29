import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { adaptVerifiedWorldHistory } from "@avatark/narrative-ir-adapter"
import { interpretNarrativeEvidence } from "./interpret.ts"
import { certifyInterpretationCandidate } from "./certify.ts"
import { EVIDENCE_REQUIREMENT_CLASSIFICATION, NOT_YET_INTEGRATED_EVIDENCE_CLASSES } from "./provenance.ts"
import { MalformedAdaptedEvidenceError, UnsupportedEvidenceKindError } from "./errors.ts"
import {
  OCCURRENCE_EVIDENCE_KIND,
  WORLD_HISTORY_ENTRY_EVIDENCE_KIND,
  evidenceItemFromOccurrenceFact,
  evidenceItemFromWorldHistoryEntryFact,
} from "./worldHistoryEvidence.ts"
import type { InterpreterIdentity, NarrativeEvidenceItem } from "./types.ts"

// Authoritative material: the adapter package's byte-identical copies of
// published compiler output (compiler main 0dc671d502cb2600fc4e2e41f5f9c30a2ebfdee9;
// provenance and blob hashes are asserted in
// packages/narrative-ir-adapter/src/worldHistoryEvidence.test.ts).
const IDENTITY: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }
const here = path.dirname(fileURLToPath(import.meta.url))
const adapterFixture = (name: string) =>
  readFileSync(path.join(here, "..", "..", "narrative-ir-adapter", "test", "fixtures", name), "utf8")

const TIMELINE = {
  artifact: { fixtureId: "r04r2-episode-label-independent-timeline", digest: "32a0edf279035bd45f32c6b64b937e451750d89de0a8ae9713760450396e00e3" },
  canonicalBytes: adapterFixture("compiler-compiled-r04r2-episode-label-independent-timeline.canonical.json"),
}
const E = {
  artifact: { fixtureId: "E-n-visit-accumulated-history", digest: "efbb1fb6980ae9f1fe4616dea7be17349beb22e91bf9ca176e724f8e869a31da" },
  canonicalBytes: adapterFixture("compiler-golden-E-n-visit-accumulated-history.canonical.json"),
}

function worldEvidence(input: unknown): NarrativeEvidenceItem[] {
  const result = adaptVerifiedWorldHistory(input)
  assert.equal(result.decision, "ADAPTED")
  if (result.decision !== "ADAPTED") return []
  return [...result.worldHistoryEntries.map(evidenceItemFromWorldHistoryEntryFact), ...result.occurrences.map(evidenceItemFromOccurrenceFact)]
}

test("WH1: verified world history and occurrences become WorldEvidence that Narrative Interpretation accepts as ADAPTED_REAL", () => {
  const evidence = worldEvidence(TIMELINE)
  assert.deepEqual(
    evidence.map((e) => [e.evidenceId, e.sourceKind]),
    [
      ["history-pool/world-history-first-light-water-timeline#0", WORLD_HISTORY_ENTRY_EVIDENCE_KIND],
      ["history-pool/world-history-first-light-water-timeline#1", WORLD_HISTORY_ENTRY_EVIDENCE_KIND],
      ["history-pool/world-history-first-light-water-timeline#2", WORLD_HISTORY_ENTRY_EVIDENCE_KIND],
      ["occurrence/origin-consequence-established", OCCURRENCE_EVIDENCE_KIND],
      ["occurrence/second-arc-continuation", OCCURRENCE_EVIDENCE_KIND],
      ["occurrence/third-arc-autonomous-continuation", OCCURRENCE_EVIDENCE_KIND],
    ],
  )
  const candidate = interpretNarrativeEvidence({ schemaVersion: "1", evidence }, IDENTITY)
  assert.ok(candidate.provenance.evidenceProvenance.every((p) => p.integration === "ADAPTED_REAL"))
})

test("WH2: provenance retains the verified source artifact and the compiler document key, with no fabricated ruleId/eventId", () => {
  const candidate = interpretNarrativeEvidence({ schemaVersion: "1", evidence: worldEvidence(TIMELINE) }, IDENTITY)
  for (const entry of candidate.provenance.evidenceProvenance) {
    assert.deepEqual(entry.sourceArtifact, { sourceId: TIMELINE.artifact.fixtureId, digest: TIMELINE.artifact.digest })
    assert.equal(entry.sourceIrVersion, "0.3.0")
    assert.ok(entry.sourceDocumentKey === "history-pool/world-history-first-light-water-timeline" || entry.sourceDocumentKey?.startsWith("occurrence/"))
  }
})

test("WH3: a candidate built only from verified world-history evidence certifies under the unchanged certification policy", () => {
  const input = { schemaVersion: "1", evidence: worldEvidence(TIMELINE) }
  const candidate = interpretNarrativeEvidence(input, IDENTITY)
  const result = certifyInterpretationCandidate(candidate, input, IDENTITY)
  assert.equal(result.decision, "CERTIFIED", JSON.stringify(result))
})

test("WH4: open history references survive into WorldEvidence unchanged", () => {
  const evidence = worldEvidence(E)
  assert.equal(evidence.length, 3)
  for (const item of evidence) {
    const payload = item.payload as { reference: { family: string | null; materialized: boolean } }
    assert.equal(payload.reference.materialized, false)
  }
})

test("WH5: world-history evidence is deterministic end to end", () => {
  const first = interpretNarrativeEvidence({ schemaVersion: "1", evidence: worldEvidence(TIMELINE) }, IDENTITY)
  for (let i = 0; i < 3; i++) {
    const again = interpretNarrativeEvidence({ schemaVersion: "1", evidence: worldEvidence(TIMELINE) }, IDENTITY)
    assert.deepEqual(again, first)
  }
})

test("WH6: malformed world-history payloads are refused, and unconnected classes stay refused", () => {
  const [entry] = worldEvidence(TIMELINE)
  const broken = { ...entry, payload: { ...(entry.payload as object), position: -1 } }
  assert.throws(() => interpretNarrativeEvidence({ schemaVersion: "1", evidence: [broken] }, IDENTITY), MalformedAdaptedEvidenceError)
  const personal = { evidenceId: "p-1", sourceKind: "PERSONAL_VISITOR_HISTORY", payload: {} }
  assert.throws(() => interpretNarrativeEvidence({ schemaVersion: "1", evidence: [personal] }, IDENTITY), UnsupportedEvidenceKindError)
})

test("WH7: the two connected world-history classes are classified, integrated, and nothing else moved", () => {
  for (const kind of [WORLD_HISTORY_ENTRY_EVIDENCE_KIND, OCCURRENCE_EVIDENCE_KIND]) {
    assert.equal(EVIDENCE_REQUIREMENT_CLASSIFICATION[kind], "OPTIONAL_CONTEXT")
    assert.equal(NOT_YET_INTEGRATED_EVIDENCE_CLASSES.includes(kind), false)
  }
  for (const stillOpen of ["PERSONAL_VISITOR_HISTORY", "CONSEQUENCE_PHYSICAL", "CONSEQUENCE_RELATIONAL", "CONSEQUENCE_LONGITUDINAL", "NARRATIVE_RESIDUE", "CAUSAL_ATTRIBUTION"]) {
    assert.ok(NOT_YET_INTEGRATED_EVIDENCE_CLASSES.includes(stillOpen), stillOpen)
  }
  assert.equal(EVIDENCE_REQUIREMENT_CLASSIFICATION.NARRATIVE_RESIDUE, "NOT_RELEVANT_TO_INTERPRETATION")
})
