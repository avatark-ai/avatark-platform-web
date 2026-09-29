import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { adaptVerifiedCausalHistory } from "./causalHistoryEvidence.ts"
import type { CausalHistoryAdaptationResult } from "./causalHistoryEvidence.ts"
import { adaptVerifiedWorldHistory } from "./worldHistoryEvidence.ts"

// Material. Compiler authority: avatark-ai/studiok-living-world-compiler,
// branch main, commit 0dc671d502cb2600fc4e2e41f5f9c30a2ebfdee9. Nothing is
// taken from the quarantined sibling compiler lineage.
//
// GOLDEN_A -- published golden scripts/golden/fixtures__positive__A-...canonical.json
//   (byte-identical; digest from scripts/golden/digests.json). Its PlaceMemory
//   causalHistory references two Consequences that ARE materialized locally.
// OPEN_REFS -- compiler-emitted canonical bytes of the published compiler
//   fixture scripts/fixtures/r05c-open-references-valid.json (source blob
//   45d5c8c944fed3a22506f5eb1333a10e691ea037), produced by that commit's own
//   compile(). Its PlaceMemory causalHistory is [Occurrence, Consequence], both
//   open (not materialized). Not in the golden registry.
// LOCAL_DUP -- TEST-AUTHORED, not published compiler material: canonical
//   bytes that commit's compile() emitted (it accepted the fixture, R11/R20/R21
//   included) for test/fixtures/r3g3-11-causal-history-local-and-duplicate.source.json.
//   No published artifact has a locally materialized Occurrence reference or
//   a repeated member; this fixture exists only to exercise those shapes.
const here = path.dirname(fileURLToPath(import.meta.url))
const raw = (name: string) => readFileSync(path.join(here, "..", "test", "fixtures", name))
const blobOf = (bytes: Buffer) => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex")
const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex")

const GOLDEN_A = {
  file: "compiler-golden-A-intervention-delayed-consequence-return-evidence.canonical.json",
  blob: "baaf2047f2cb2046a423540efc1772ffba063588",
  fixtureId: "A-intervention-delayed-consequence-return-evidence",
  digest: "19a4135db940267c8bc8c574903b22752024ce16961f1577dbe8cf0dfc764f86",
}
const OPEN_REFS = {
  file: "compiler-compiled-r05c-open-references-valid.canonical.json",
  blob: "25ac0d75a24569d2931bc3620068c97fbf252b72",
  fixtureId: "r05c-open-references-valid",
  digest: "b44f7116d1de1906fec4b600df9b8bcfcc75232d44596799522ee7eff84acfa7",
}
const LOCAL_DUP = {
  file: "r3g3-11-causal-history-local-and-duplicate.canonical.json",
  blob: "bbc57575f5ea5f93311d1d5ed6ac8cee2827b284",
  fixtureId: "r3g3-11-causal-history-local-and-duplicate",
  digest: "8778ed17973995f076867b303c8fbb0f5b6ce03a88fef5ec8659772d1d70c13c",
}
type Material = typeof GOLDEN_A
const input = (m: Material) => ({ artifact: { fixtureId: m.fixtureId, digest: m.digest }, canonicalBytes: raw(m.file).toString("utf8") })
const canonicalDocs = (m: Material) => JSON.parse(raw(m.file).toString("utf8")).artifact.documents
const reason = (r: CausalHistoryAdaptationResult) => (r.decision === "REFUSED" ? r.reason : "ADAPTED")

function adapted(m: Material) {
  const result = adaptVerifiedCausalHistory(input(m))
  assert.equal(result.decision, "ADAPTED", JSON.stringify(result))
  if (result.decision !== "ADAPTED") throw new Error("unreachable")
  return result
}
const members = (m: Material) => adapted(m).causalHistoryReferences

test("C0: fixture bytes are exactly the recorded compiler output", () => {
  for (const m of [GOLDEN_A, OPEN_REFS, LOCAL_DUP]) {
    const bytes = raw(m.file)
    assert.equal(blobOf(bytes), m.blob, m.file)
    assert.equal(sha256(bytes.toString("utf8")), m.digest, m.file)
  }
})

test("P1: an Occurrence causal-history member becomes OCCURRENCE_REFERENCE evidence", () => {
  const first = members(LOCAL_DUP)[0]
  assert.equal(first.targetRef, "occurrence/test-grove-local-arrival")
  assert.equal(first.referenceFamily, "OCCURRENCE_REFERENCE")
  assert.equal(first.kind, "PLACE_CAUSAL_HISTORY_REFERENCE")
})

test("P2: a Consequence causal-history member becomes CONSEQUENCE_REFERENCE evidence", () => {
  assert.deepEqual(
    members(GOLDEN_A).map((r) => [r.targetRef, r.referenceFamily]),
    [
      ["consequence/immediate-flow-change", "CONSEQUENCE_REFERENCE"],
      ["consequence/delayed-downstream-improvement", "CONSEQUENCE_REFERENCE"],
    ],
  )
})

test("P3/G: a mixed causalHistory keeps its exact order, never sorted or grouped by family", () => {
  const canonical = canonicalDocs(LOCAL_DUP)["place-memory/test-grove"].causalHistory
  const refs = members(LOCAL_DUP)
  assert.deepEqual(refs.map((r) => r.targetRef), canonical)
  assert.deepEqual(refs.map((r) => r.position), [0, 1, 2, 3, 4])
  assert.deepEqual(
    refs.map((r) => r.referenceFamily),
    ["OCCURRENCE_REFERENCE", "CONSEQUENCE_REFERENCE", "OCCURRENCE_REFERENCE", "CONSEQUENCE_REFERENCE", "OCCURRENCE_REFERENCE"],
  )
  assert.notDeepEqual(refs.map((r) => r.targetRef), [...canonical].sort())
  assert.deepEqual(
    members(OPEN_REFS).map((r) => [r.targetRef, r.referenceFamily]),
    [
      ["occurrence/open-shore-earlier-erosion", "OCCURRENCE_REFERENCE"],
      ["consequence/open-shore-earlier-clearing", "CONSEQUENCE_REFERENCE"],
    ],
  )
})

test("P4/P5/F: open Occurrence and Consequence references are preserved and nothing is fabricated for them", () => {
  const result = adapted(OPEN_REFS)
  const docs = canonicalDocs(OPEN_REFS)
  for (const r of result.causalHistoryReferences) {
    assert.equal(r.targetMaterialized, false)
    assert.ok(!(r.targetRef in docs))
  }
  assert.deepEqual(Object.keys(result).sort(), ["causalHistoryReferences", "decision", "source"])
})

test("P6: a locally present Occurrence reference means exactly what an open one means", () => {
  const refs = members(LOCAL_DUP)
  const local = refs.find((r) => r.targetRef === "occurrence/test-grove-local-arrival")!
  const open = refs.find((r) => r.targetRef === "occurrence/test-grove-earlier-visit")!
  assert.equal(local.targetMaterialized, true)
  assert.equal(open.targetMaterialized, false)
  const { targetMaterialized: _a, targetRef: _b, position: _c, ...localRest } = local
  const { targetMaterialized: _d, targetRef: _e, position: _f, ...openRest } = open
  assert.deepEqual(localRest, openRest)
})

test("P7/D: a locally present Consequence reference does not adapt the Consequence or read its contents", () => {
  const result = adapted(GOLDEN_A)
  const docs = canonicalDocs(GOLDEN_A)
  for (const r of result.causalHistoryReferences) assert.equal(r.targetMaterialized, true)
  assert.ok(docs["consequence/immediate-flow-change"].causalAttribution)
  const json = JSON.stringify(result)
  for (const consequenceField of ["register", "causalAttribution", "worldStateDelta", "triggerId", "evidenceTiming", "personalHistoryEntryId", "relationshipChainId", "nextChainState", "CROSS_VISIT_SPAN_CAUSED", "PHYSICAL"]) {
    assert.ok(!json.includes(consequenceField), `output must not carry ${consequenceField}`)
  }
})

test("P8-P11: source artifact, PlaceMemory key, placeId and target identity are all retained", () => {
  const refs = members(OPEN_REFS)
  for (const r of refs) {
    assert.deepEqual(r.source, { fixtureId: OPEN_REFS.fixtureId, digest: OPEN_REFS.digest, canonicalizationVersion: "0.1.0" })
    assert.equal(r.placeMemoryKey, "place-memory/open-shore")
    assert.equal(r.placeId, "place/open-shore")
    assert.equal(r.placeMemoryIrVersion, "0.3.0")
  }
  assert.deepEqual(refs.map((r) => r.targetRef), ["occurrence/open-shore-earlier-erosion", "consequence/open-shore-earlier-clearing"])
})

test("P12: repeated evaluation is byte-identical", () => {
  for (const m of [GOLDEN_A, OPEN_REFS, LOCAL_DUP]) {
    const first = JSON.stringify(adaptVerifiedCausalHistory(input(m)))
    for (let i = 0; i < 5; i++) assert.equal(JSON.stringify(adaptVerifiedCausalHistory(input(m))), first)
  }
})

test("A: a digest mismatch produces no causal-history evidence", () => {
  const wrongDigest = adaptVerifiedCausalHistory({ ...input(GOLDEN_A), artifact: { fixtureId: GOLDEN_A.fixtureId, digest: OPEN_REFS.digest } })
  assert.equal(reason(wrongDigest), "DIGEST_MISMATCH")
  assert.ok(!("causalHistoryReferences" in wrongDigest))
  const reordered = input(GOLDEN_A).canonicalBytes.replace(
    '"causalHistory":["consequence/immediate-flow-change","consequence/delayed-downstream-improvement"]',
    '"causalHistory":["consequence/delayed-downstream-improvement","consequence/immediate-flow-change"]',
  )
  assert.notEqual(reordered, input(GOLDEN_A).canonicalBytes)
  assert.equal(reason(adaptVerifiedCausalHistory({ ...input(GOLDEN_A), canonicalBytes: reordered })), "DIGEST_MISMATCH")
})

test("B: an unsupported canonicalization version produces no causal-history evidence", () => {
  const future = input(OPEN_REFS).canonicalBytes.replace('"canonicalizationVersion":"0.1.0"', '"canonicalizationVersion":"0.2.0"')
  assert.equal(reason(adaptVerifiedCausalHistory({ artifact: { fixtureId: OPEN_REFS.fixtureId, digest: sha256(future) }, canonicalBytes: future })), "UNSUPPORTED_CANONICALIZATION_VERSION")
})

test("C: caller objects beside the verified bytes cannot influence the evidence", () => {
  const clean = adapted(LOCAL_DUP)
  const forged = {
    ...input(LOCAL_DUP),
    canonicalArtifact: { documents: { "place-memory/forged": { placeId: "place/forged", causalHistory: ["occurrence/forged"] } } },
    causalHistoryReferences: [{ targetRef: "occurrence/forged" }],
  }
  const result = adaptVerifiedCausalHistory(forged)
  assert.deepEqual(result, clean)
  assert.ok(!JSON.stringify(result).includes("forged"))
})

test("E: the output is reference evidence with a fixed shape -- no causal explanation fields", () => {
  for (const r of members(LOCAL_DUP)) {
    assert.deepEqual(Object.keys(r).sort(), ["kind", "placeId", "placeMemoryIrVersion", "placeMemoryKey", "position", "referenceFamily", "source", "targetMaterialized", "targetRef"])
  }
})

test("H: repeated references are not deduplicated", () => {
  const refs = members(LOCAL_DUP)
  const repeated = refs.filter((r) => r.targetRef === "occurrence/test-grove-local-arrival")
  assert.deepEqual(repeated.map((r) => r.position), [0, 4])
  assert.equal(refs.length, 5)
})

test("Occurrence reference and Occurrence evidence stay distinct facts", () => {
  const history = adaptVerifiedWorldHistory(input(LOCAL_DUP))
  assert.equal(history.decision, "ADAPTED")
  if (history.decision !== "ADAPTED") return
  assert.deepEqual(history.occurrences.map((o) => o.occurrenceKey), ["occurrence/test-grove-local-arrival"])
  const references = members(LOCAL_DUP).filter((r) => r.referenceFamily === "OCCURRENCE_REFERENCE")
  assert.equal(references.length, 3)
  for (const r of references) assert.ok(!("persistence" in r) && !("observations" in r))
})

test("verified-but-malformed causal history is refused, never reinterpreted", () => {
  const pm = (causalHistory: unknown, placeId: unknown = "place/p") => ({
    "place-memory/p": { irVersion: "0.3.0", placeId, currentPhysicalState: {}, currentEcologicalState: {}, causalHistory, narrativeMeaning: {}, expectedPatternState: {} },
  })
  const cases: Array<[string, Record<string, unknown>]> = [
    ["action family", pm(["action/a"])],
    ["no prefix", pm(["just-an-id"])],
    ["empty local id", pm(["occurrence/"])],
    ["non-string member", pm([42])],
    ["not an array", pm("occurrence/a")],
    ["placeId not a place", pm([], "entity/e")],
  ]
  for (const [label, documents] of cases) {
    const bytes = JSON.stringify({ canonicalizationVersion: "0.1.0", artifact: { documents, fixtureId: "malformed" } })
    assert.equal(reason(adaptVerifiedCausalHistory({ artifact: { fixtureId: "malformed", digest: sha256(bytes) }, canonicalBytes: bytes })), "MALFORMED_HISTORY_DOCUMENT", label)
  }
})

test("I/J: the adaptation source introduces no personal history, NarrativeResidue, or other out-of-scope concept", () => {
  const source = readFileSync(path.join(here, "causalHistoryEvidence.ts"), "utf8")
  const specifiers = [...source.matchAll(/(?:from\s+|require\()\s*["']([^"']+)["']/g)].map((m) => m[1])
  assert.ok(specifiers.every((s) => s.startsWith("./")), JSON.stringify(specifiers))
  const code = source.replace(/\/\/.*$/gm, "")
  for (const term of ["PERSONAL_VISITOR_HISTORY", "history-pool", "narrative-residue", "NarrativeResidue", "causalAttribution", "worldStateDelta", "Episode", "Beat", "Encounter", "NarrativeEntity", "WRO", "fetch(", "Date.", "Math.random", "canonicalize("]) {
    assert.ok(!code.includes(term), `causalHistoryEvidence.ts code must not reference ${term}`)
  }
})
