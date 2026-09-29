import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import {
  adaptVerifiedCausalHistory,
  adaptVerifiedPhysicalConsequences,
  adaptVerifiedWorldHistory,
  artifactReferenceFromCanonical,
  disconfirmationCountFromConfirmationSequence,
  evaluateExpectation,
  expectationReferenceFromCanonical,
} from "@avatark/narrative-ir-adapter"
import type { CanonicalExpectedPatternState } from "@avatark/narrative-ir-adapter"
import { interpretNarrativeEvidence } from "./interpret.ts"
import { certifyInterpretationCandidate } from "./certify.ts"
import { evidenceItemFromOccurrenceFact, evidenceItemFromWorldHistoryEntryFact, OCCURRENCE_EVIDENCE_KIND, WORLD_HISTORY_ENTRY_EVIDENCE_KIND } from "./worldHistoryEvidence.ts"
import { evidenceItemFromPlaceCausalHistoryReferenceFact, PLACE_CAUSAL_HISTORY_EVIDENCE_KIND } from "./causalHistoryEvidence.ts"
import { evidenceItemFromPhysicalConsequenceFact, PHYSICAL_CONSEQUENCE_EVIDENCE_KIND } from "./physicalConsequenceEvidence.ts"
import { evidenceItemFromExpectedAbsenceFact } from "./worldEvidence.ts"
import type { InterpreterIdentity, NarrativeEvidenceItem } from "./types.ts"

// PLT-R3G5-02A: canonicalizationVersion reaches EvidenceProvenanceEntry.sourceArtifact
// for the four verified R3-G3 kinds, copied from each item's own verified
// source. This is DATA propagation only: nothing here makes certification
// verification-backed (that is PLT-R3G5-02C), so no test below claims that a
// carried version was verified at the certification boundary.
//
// Material: the adapter package's byte-identical compiler fixtures (provenance
// and blob hashes asserted in the adapter's own *Evidence.test.ts files).
const IDENTITY: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }
const here = path.dirname(fileURLToPath(import.meta.url))
const adapterFixture = (name: string) => readFileSync(path.join(here, "..", "..", "narrative-ir-adapter", "test", "fixtures", name), "utf8")
const material = (fixtureId: string, digest: string, file: string) => ({ artifact: { fixtureId, digest }, canonicalBytes: adapterFixture(file) })

const TIMELINE = material("r04r2-episode-label-independent-timeline", "32a0edf279035bd45f32c6b64b937e451750d89de0a8ae9713760450396e00e3", "compiler-compiled-r04r2-episode-label-independent-timeline.canonical.json")
const OPEN_REFS = material("r05c-open-references-valid", "b44f7116d1de1906fec4b600df9b8bcfcc75232d44596799522ee7eff84acfa7", "compiler-compiled-r05c-open-references-valid.canonical.json")
const GOLDEN_A = material("A-intervention-delayed-consequence-return-evidence", "19a4135db940267c8bc8c574903b22752024ce16961f1577dbe8cf0dfc764f86", "compiler-golden-A-intervention-delayed-consequence-return-evidence.canonical.json")

// The version the compiler wrote into each artifact's canonical bytes -- the
// one authoritative origin, read here independently of the adapter.
const bytesVersion = (m: { canonicalBytes: string }) => (JSON.parse(m.canonicalBytes) as { canonicalizationVersion: string }).canonicalizationVersion

function adapted<T>(result: { decision: string } & Partial<T>): T {
  assert.equal(result.decision, "ADAPTED", JSON.stringify(result))
  return result as unknown as T
}
const worldHistory = () => adapted<{ worldHistoryEntries: never[]; occurrences: never[] }>(adaptVerifiedWorldHistory(TIMELINE) as never)

const EVIDENCE: Record<string, () => { material: { canonicalBytes: string }; items: NarrativeEvidenceItem[] }> = {
  [WORLD_HISTORY_ENTRY_EVIDENCE_KIND]: () => ({ material: TIMELINE, items: worldHistory().worldHistoryEntries.map(evidenceItemFromWorldHistoryEntryFact) }),
  [OCCURRENCE_EVIDENCE_KIND]: () => ({ material: TIMELINE, items: worldHistory().occurrences.map(evidenceItemFromOccurrenceFact) }),
  [PLACE_CAUSAL_HISTORY_EVIDENCE_KIND]: () => ({
    material: OPEN_REFS,
    items: adapted<{ causalHistoryReferences: never[] }>(adaptVerifiedCausalHistory(OPEN_REFS) as never).causalHistoryReferences.map(evidenceItemFromPlaceCausalHistoryReferenceFact),
  }),
  [PHYSICAL_CONSEQUENCE_EVIDENCE_KIND]: () => ({
    material: GOLDEN_A,
    items: adapted<{ physicalConsequences: never[] }>(adaptVerifiedPhysicalConsequences(GOLDEN_A) as never).physicalConsequences.map(evidenceItemFromPhysicalConsequenceFact),
  }),
}
const provenanceOf = (items: NarrativeEvidenceItem[]) => interpretNarrativeEvidence({ schemaVersion: "1", evidence: items }, IDENTITY).provenance.evidenceProvenance
const sourceOf = (item: NarrativeEvidenceItem) => (item.payload as { source: { fixtureId: string; digest: string; canonicalizationVersion: string } }).source

for (const [kind, build] of Object.entries(EVIDENCE)) {
  test(`CV1-4: ${kind} provenance carries exactly its verified source's {sourceId, digest, canonicalizationVersion}`, () => {
    const { material: m, items } = build()
    assert.ok(items.length > 0)
    const provenance = provenanceOf(items)
    assert.equal(provenance.length, items.length)
    for (const [i, entry] of provenance.entries()) {
      assert.equal(entry.sourceKind, kind)
      const source = sourceOf(items[i])
      assert.equal(source.canonicalizationVersion, bytesVersion(m))
      assert.deepEqual(entry.sourceArtifact, { sourceId: source.fixtureId, digest: source.digest, canonicalizationVersion: source.canonicalizationVersion })
    }
  })
}

test("CV5: the carried version is copied from the payload's source, not a default -- whatever the payload carries is what provenance carries", () => {
  // A payload is still caller-constructible today; copying it through proves
  // propagation only. PLT-R3G5-02C, not this gate, will refuse such an item.
  for (const build of Object.values(EVIDENCE)) {
    const [item] = build().items
    const relabeled = { ...item, payload: { ...(item.payload as object), source: { ...sourceOf(item), canonicalizationVersion: "0.9.9-propagation-probe" } } }
    const [entry] = provenanceOf([relabeled])
    assert.equal(entry.sourceArtifact?.canonicalizationVersion, "0.9.9-propagation-probe")
  }
  const code = readFileSync(path.join(here, "provenance.ts"), "utf8").replace(/\/\/.*$/gm, "")
  assert.ok(!code.includes("SUPPORTED_CANONICALIZATION_VERSIONS"))
  assert.ok(!/["']\d+\.\d+\.\d+["']/.test(code), "provenance.ts must not hard-code a version literal")
})

// The published legacy EPS construction (see worldEvidence.test.ts), from the
// hand-authored canonical-schema fragment -- never a verified artifact.
function legacyExpectedAbsenceItem(artifactReferenceExtra: Record<string, unknown> = {}): NarrativeEvidenceItem {
  const fixture = JSON.parse(readFileSync(path.join(here, "..", "test", "fixtures", "bh-e002-expected-absence-canonical-fragment.json"), "utf8")) as {
    fixtureId: string
    digest: string
    subjectId: string
    property: string
    documents: Record<string, unknown>
  }
  const placeMemory = fixture.documents["place-memory/waiting-hollow"] as { placeId: string; expectedPatternState: CanonicalExpectedPatternState }
  const rr = fixture.documents["runtime-requirements/occupancy-pattern"] as { id: string; requires: readonly string[] }
  const artifactReference = { ...artifactReferenceFromCanonical({ fixtureId: fixture.fixtureId, digest: fixture.digest }, rr, placeMemory.placeId), ...artifactReferenceExtra }
  const expectation = expectationReferenceFromCanonical(placeMemory.expectedPatternState, {
    expectationId: `expectation-${placeMemory.placeId}`,
    subjectId: fixture.subjectId,
    property: fixture.property,
    artifactReference,
  })
  const eps = placeMemory.expectedPatternState
  const result = evaluateExpectation(expectation, {
    observedOutcome: "DEVIATED",
    withinPatternWindow: false,
    evidenceCompleteness: "COMPLETE",
    logicalTick: 10,
    disconfirmationCountSoFar: disconfirmationCountFromConfirmationSequence(eps.confirmationSequence.slice(0, -1)),
  })
  assert.equal(result.status, "EXPECTED_ABSENCE")
  if (result.status !== "EXPECTED_ABSENCE") throw new Error("unreachable")
  return evidenceItemFromExpectedAbsenceFact(result.fact)
}

test("CV6: legacy PLACE_MEMORY_EXPECTED_PATTERN_STATE provenance gains no canonicalizationVersion -- not by default, not by caller injection", () => {
  for (const item of [legacyExpectedAbsenceItem(), legacyExpectedAbsenceItem({ canonicalizationVersion: "0.1.0", verified: true })]) {
    const [entry] = provenanceOf([item])
    assert.equal(entry.sourceKind, "PLACE_MEMORY_EXPECTED_PATTERN_STATE")
    assert.equal(entry.integration, "ADAPTED_REAL")
    assert.deepEqual(Object.keys(entry.sourceArtifact ?? {}).sort(), ["digest", "eventId", "ruleId", "sourceId"])
    assert.ok(!("canonicalizationVersion" in (entry.sourceArtifact ?? {})))
  }
})

test("CV7: NOT_YET_INTEGRATED evidence still carries no sourceArtifact and therefore no canonicalizationVersion", () => {
  const unconnected = { evidenceId: "caller-label-1", sourceKind: "SOME_CALLER_LABEL", payload: { source: { fixtureId: "x", digest: "0".repeat(64), canonicalizationVersion: "0.1.0" } } }
  const [entry] = provenanceOf([unconnected])
  assert.equal(entry.integration, "NOT_YET_INTEGRATED")
  assert.ok(!("sourceArtifact" in entry))
  assert.ok(!JSON.stringify(entry).includes("canonicalizationVersion"))
})

test("CV8: identical input still yields identical provenance and identical certified output", () => {
  const items = Object.values(EVIDENCE).flatMap((build) => build().items)
  const input = { schemaVersion: "1", evidence: items }
  const first = certifyInterpretationCandidate(interpretNarrativeEvidence(input, IDENTITY), input, IDENTITY)
  assert.equal(first.decision, "CERTIFIED", JSON.stringify(first))
  for (let i = 0; i < 3; i++) {
    const again = { schemaVersion: "1", evidence: Object.values(EVIDENCE).flatMap((build) => build().items) }
    assert.deepEqual(certifyInterpretationCandidate(interpretNarrativeEvidence(again, IDENTITY), again, IDENTITY), first)
  }
})

test("CV9: a different payload version yields different certified provenance and a different input identity (data binding only, not verification)", () => {
  const [item] = EVIDENCE[PHYSICAL_CONSEQUENCE_EVIDENCE_KIND]().items
  const certified = (evidence: NarrativeEvidenceItem) => {
    const input = { schemaVersion: "1", evidence: [evidence] }
    const result = certifyInterpretationCandidate(interpretNarrativeEvidence(input, IDENTITY), input, IDENTITY)
    assert.equal(result.decision, "CERTIFIED", JSON.stringify(result))
    if (result.decision !== "CERTIFIED") throw new Error("unreachable")
    return result.certifiedInterpretation
  }
  const baseline = certified(item)
  const changed = certified({ ...item, payload: { ...(item.payload as object), source: { ...sourceOf(item), canonicalizationVersion: "0.9.9-propagation-probe" } } })
  assert.equal(baseline.evidenceProvenance[0].sourceArtifact?.canonicalizationVersion, "0.1.0")
  assert.equal(changed.evidenceProvenance[0].sourceArtifact?.canonicalizationVersion, "0.9.9-propagation-probe")
  assert.notEqual(changed.interpretationInputIdentity, baseline.interpretationInputIdentity)
  assert.notEqual(changed.certifiedInterpretationId, baseline.certifiedInterpretationId)
  assert.notDeepEqual(changed.evidenceProvenance, baseline.evidenceProvenance)
})
