import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { adaptVerifiedWorldHistory } from "./worldHistoryEvidence.ts"
import type { WorldHistoryAdaptationResult } from "./worldHistoryEvidence.ts"
import r06ProtocolFixture from "../test/fixtures/r06-living-vrindavan-protocol-identity.json" with { type: "json" }

// Authoritative positive material, all from the published compiler
// avatark-ai/studiok-living-world-compiler, branch main, commit
// 0dc671d502cb2600fc4e2e41f5f9c30a2ebfdee9. Nothing is taken from the
// quarantined sibling compiler lineage.
//
// Goldens (byte-identical copies of scripts/golden/fixtures__positive__<id>.json.canonical.json;
// digest = scripts/golden/digests.json["fixtures/positive/<id>.json"]):
//   E-n-visit-accumulated-history                       blob 7d674347abfcb670f339e73b6c0f803a61e630cd
//   N-observation-focus-and-duration                    blob 2283fde183f721ed1fed44ec963bfe53d51b1800
//   A-intervention-delayed-consequence-return-evidence  blob baaf2047f2cb2046a423540efc1772ffba063588
// Compiler-emitted canonical bytes of the published compiler fixture
// scripts/fixtures/r04r2-episode-label-independent-timeline.json (source blob
// 804dea4b47de2ce15c4762880c06e35207e06c76), produced by that commit's own
// compile(); it is not in the golden registry, and is the only published
// artifact whose WORLD_HISTORY entries target Occurrences in the same artifact:
//   r04r2-episode-label-independent-timeline            blob cfb83f870507092e94ad5bcd9b38ba9b19a3d652
const here = path.dirname(fileURLToPath(import.meta.url))
const fixtureBytes = (name: string) => readFileSync(path.join(here, "..", "test", "fixtures", name))
const blobOf = (raw: Buffer) => createHash("sha1").update(`blob ${raw.length}\0`).update(raw).digest("hex")
const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex")

interface Material {
  readonly file: string
  readonly blob: string
  readonly fixtureId: string
  readonly digest: string
}
const E: Material = {
  file: "compiler-golden-E-n-visit-accumulated-history.canonical.json",
  blob: "7d674347abfcb670f339e73b6c0f803a61e630cd",
  fixtureId: "E-n-visit-accumulated-history",
  digest: "efbb1fb6980ae9f1fe4616dea7be17349beb22e91bf9ca176e724f8e869a31da",
}
const N: Material = {
  file: "compiler-golden-N-observation-focus-and-duration.canonical.json",
  blob: "2283fde183f721ed1fed44ec963bfe53d51b1800",
  fixtureId: "N-observation-focus-and-duration",
  digest: "dbdba86a6992596dd593e3072e6c5ce666baf89960cb6b8502511504428b5352",
}
const A: Material = {
  file: "compiler-golden-A-intervention-delayed-consequence-return-evidence.canonical.json",
  blob: "baaf2047f2cb2046a423540efc1772ffba063588",
  fixtureId: "A-intervention-delayed-consequence-return-evidence",
  digest: "19a4135db940267c8bc8c574903b22752024ce16961f1577dbe8cf0dfc764f86",
}
const TIMELINE: Material = {
  file: "compiler-compiled-r04r2-episode-label-independent-timeline.canonical.json",
  blob: "cfb83f870507092e94ad5bcd9b38ba9b19a3d652",
  fixtureId: "r04r2-episode-label-independent-timeline",
  digest: "32a0edf279035bd45f32c6b64b937e451750d89de0a8ae9713760450396e00e3",
}

const input = (m: Material) => ({ artifact: { fixtureId: m.fixtureId, digest: m.digest }, canonicalBytes: fixtureBytes(m.file).toString("utf8") })

function adapted(m: Material) {
  const result = adaptVerifiedWorldHistory(input(m))
  assert.equal(result.decision, "ADAPTED", JSON.stringify(result))
  if (result.decision !== "ADAPTED") throw new Error("unreachable")
  return result
}
const reason = (r: WorldHistoryAdaptationResult) => (r.decision === "REFUSED" ? r.reason : "ADAPTED")

test("H0: every positive fixture is byte-identical to its published compiler source (git blob hash)", () => {
  for (const m of [E, N, A, TIMELINE]) {
    const raw = fixtureBytes(m.file)
    assert.equal(blobOf(raw), m.blob, m.file)
    assert.equal(sha256(raw.toString("utf8")), m.digest, m.file)
  }
})

test("H1: a verified artifact's WORLD_HISTORY pool becomes ordered world-history entry facts", () => {
  const result = adapted(E)
  assert.deepEqual(
    result.worldHistoryEntries.map((e) => [e.poolKey, e.position, e.entryRef, e.poolAuthority]),
    [
      ["history-pool/world-history-first-light-water", 0, "consequence/immediate-flow-change", "C2_SHARED_EMERGENT"],
      ["history-pool/world-history-first-light-water", 1, "consequence/delayed-downstream-improvement", "C2_SHARED_EMERGENT"],
      ["history-pool/world-history-first-light-water", 2, "occurrence/entity-repeated-visit-1", "C2_SHARED_EMERGENT"],
    ],
  )
  for (const entry of result.worldHistoryEntries) assert.equal(entry.kind, "WORLD_HISTORY_ENTRY")
})

test("H2: verified Occurrence documents become Occurrence facts carrying their authoritative fields verbatim", () => {
  const n = adapted(N)
  assert.equal(n.occurrences.length, 1)
  const occ = n.occurrences[0]
  assert.equal(occ.occurrenceKey, "occurrence/listening-garden-visit")
  assert.equal(occ.irVersion, "0.2.0")
  const canonical = JSON.parse(fixtureBytes(N.file).toString("utf8")).artifact.documents["occurrence/listening-garden-visit"]
  assert.deepEqual(occ.persistence, canonical.persistence)
  assert.deepEqual(occ.observations, canonical.observations)

  // Golden A's occurrence has no observations; the compiler omits the empty
  // array in canonical form, and the fact reads it back as an empty list.
  const a = adapted(A)
  assert.deepEqual(
    a.occurrences.map((o) => [o.occurrenceKey, o.observations.length]),
    [["occurrence/downstream-moisture-improved", 0]],
  )
})

test("H3: PERSONAL_VISITOR_HISTORY is never classified as WORLD_HISTORY", () => {
  const result = adapted(E)
  const canonical = JSON.parse(fixtureBytes(E.file).toString("utf8")).artifact.documents
  assert.equal(canonical["history-pool/personal-visitor-history-visitor-1"].poolKind, "PERSONAL_VISITOR_HISTORY")
  assert.ok(result.worldHistoryEntries.every((e) => e.poolKey !== "history-pool/personal-visitor-history-visitor-1"))
  assert.ok(result.worldHistoryEntries.every((e) => canonical[e.poolKey].poolKind === "WORLD_HISTORY"))
})

test("H4: a digest mismatch produces no evidence", () => {
  const tampered = { ...input(E), artifact: { fixtureId: E.fixtureId, digest: N.digest } }
  const result = adaptVerifiedWorldHistory(tampered)
  assert.equal(reason(result), "DIGEST_MISMATCH")
  assert.ok(!("worldHistoryEntries" in result))
  const mutatedBytes = { ...input(E), canonicalBytes: input(E).canonicalBytes.replace("immediate-flow-change", "immediate-flow-changed") }
  assert.equal(reason(adaptVerifiedWorldHistory(mutatedBytes)), "DIGEST_MISMATCH")
})

test("H5: an unsupported canonicalization version produces no evidence", () => {
  const future = input(E).canonicalBytes.replace('"canonicalizationVersion":"0.1.0"', '"canonicalizationVersion":"0.2.0"')
  const result = adaptVerifiedWorldHistory({ artifact: { fixtureId: E.fixtureId, digest: sha256(future) }, canonicalBytes: future })
  assert.equal(reason(result), "UNSUPPORTED_CANONICALIZATION_VERSION")
})

test("H6: caller objects beside the verified bytes cannot influence the extracted evidence", () => {
  const clean = adapted(E)
  const forged = {
    ...input(E),
    canonicalArtifact: { documents: { "history-pool/forged": { poolKind: "WORLD_HISTORY", entries: ["occurrence/forged"] } } },
    documents: { "occurrence/forged": { id: "occurrence/forged" } },
    worldHistoryEntries: [{ entryRef: "occurrence/forged" }],
  }
  const result = adaptVerifiedWorldHistory(forged)
  assert.deepEqual(result, clean)
  assert.ok(JSON.stringify(result).includes("forged") === false)
})

test("H7: a legitimate open history reference is preserved, typed by its canonical family, and not fabricated", () => {
  const result = adapted(E)
  assert.deepEqual(
    result.worldHistoryEntries.map((e) => e.reference),
    [
      { family: "consequence", materialized: false },
      { family: "consequence", materialized: false },
      { family: "occurrence", materialized: false },
    ],
  )
  assert.equal(result.occurrences.length, 0) // no Occurrence is invented for an open reference
})

test("H8: a locally resolvable history reference stays stable and names the materialized Occurrence", () => {
  const result = adapted(TIMELINE)
  const occurrenceKeys = result.occurrences.map((o) => o.occurrenceKey)
  assert.equal(result.worldHistoryEntries.length, 3)
  for (const entry of result.worldHistoryEntries) {
    assert.deepEqual(entry.reference, { family: "occurrence", materialized: true })
    assert.ok(occurrenceKeys.includes(entry.entryRef))
  }
  assert.deepEqual(
    result.worldHistoryEntries.map((e) => e.entryRef),
    ["occurrence/origin-consequence-established", "occurrence/second-arc-continuation", "occurrence/third-arc-autonomous-continuation"],
  )
  assert.deepEqual(
    result.occurrences.map((o) => [o.occurrenceKey, o.sequenceIndex, o.origin]),
    [
      ["occurrence/origin-consequence-established", 1, "CONSUMER_CAUSED"],
      ["occurrence/second-arc-continuation", 2, "WORLD_PROCESS_CAUSED"],
      ["occurrence/third-arc-autonomous-continuation", 3, "UNEXPLAINED"],
    ],
  )
})

test("H9: repeated calls produce deep-equal, byte-identical output", () => {
  for (const m of [E, N, A, TIMELINE]) {
    const first = JSON.stringify(adaptVerifiedWorldHistory(input(m)))
    for (let i = 0; i < 5; i++) assert.equal(JSON.stringify(adaptVerifiedWorldHistory(input(m))), first)
  }
})

test("H10/H11: every fact retains its verified artifact source and its compiler document identity", () => {
  const result = adapted(TIMELINE)
  const expectedSource = { fixtureId: TIMELINE.fixtureId, digest: TIMELINE.digest, canonicalizationVersion: "0.1.0" }
  assert.deepEqual(result.source, expectedSource)
  for (const entry of result.worldHistoryEntries) {
    assert.deepEqual(entry.source, expectedSource)
    assert.equal(entry.poolKey, "history-pool/world-history-first-light-water-timeline")
    assert.equal(entry.poolIrVersion, "0.3.0")
  }
  for (const occ of result.occurrences) {
    assert.deepEqual(occ.source, expectedSource)
    assert.match(occ.occurrenceKey, /^occurrence\//)
  }
})

test("H12: the R06 protocol-only fixture is not treated as authoritative evidence", () => {
  const identity = { fixtureId: r06ProtocolFixture.fixtureId, digest: r06ProtocolFixture.digest }
  assert.equal(reason(adaptVerifiedWorldHistory({ artifact: identity })), "MISSING_VERIFICATION_MATERIAL")
  assert.equal(reason(adaptVerifiedWorldHistory({ artifact: identity, canonicalBytes: input(E).canonicalBytes })), "DIGEST_MISMATCH")
})

test("H13: verified-but-malformed history documents are refused, never partially adapted", () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["unknown poolKind", { "history-pool/p": { id: "history-pool/p", irVersion: "0.3.0", authority: "C2_SHARED_EMERGENT", poolKind: "SOMETHING_ELSE", entries: ["occurrence/x"] } }],
    ["id differs from key", { "history-pool/p": { id: "history-pool/q", irVersion: "0.3.0", authority: "C2_SHARED_EMERGENT", poolKind: "WORLD_HISTORY", entries: [] } }],
    ["occurrence without persistence", { "occurrence/o": { id: "occurrence/o", irVersion: "0.3.0" } }],
    ["unknown origin", { "occurrence/o": { id: "occurrence/o", irVersion: "0.3.0", persistence: { authority: "C2_SHARED_EMERGENT", lifetime: "EPHEMERAL" }, origin: "GUESSED" } }],
  ]
  for (const [label, documents] of cases) {
    const bytes = JSON.stringify({ canonicalizationVersion: "0.1.0", artifact: { documents, fixtureId: "malformed" } })
    const result = adaptVerifiedWorldHistory({ artifact: { fixtureId: "malformed", digest: sha256(bytes) }, canonicalBytes: bytes })
    assert.equal(reason(result), "MALFORMED_HISTORY_DOCUMENT", label)
  }
})

test("N1: only WORLD_HISTORY entry and OCCURRENCE facts are ever produced -- no Consequence or causalHistory evidence", () => {
  // Golden A carries Consequences and a PlaceMemory with causalHistory.
  const canonical = JSON.parse(fixtureBytes(A.file).toString("utf8")).artifact.documents
  assert.ok(Object.keys(canonical).some((k) => k.startsWith("consequence/")))
  assert.ok(Object.values(canonical).some((d) => Array.isArray((d as { causalHistory?: unknown }).causalHistory)))
  for (const m of [E, N, A, TIMELINE]) {
    const result = adapted(m)
    assert.deepEqual(Object.keys(result).sort(), ["decision", "occurrences", "source", "worldHistoryEntries"])
    for (const e of result.worldHistoryEntries) assert.equal(e.kind, "WORLD_HISTORY_ENTRY")
    for (const o of result.occurrences) assert.equal(o.kind, "OCCURRENCE")
  }
})

test("N2: the adaptation source imports only this package's own modules and names no out-of-scope concept", () => {
  const source = readFileSync(path.join(here, "worldHistoryEvidence.ts"), "utf8")
  const specifiers = [...source.matchAll(/(?:from\s+|require\()\s*["']([^"']+)["']/g)].map((m) => m[1])
  assert.ok(specifiers.every((s) => s.startsWith("./")), JSON.stringify(specifiers))
  const code = source.replace(/\/\/.*$/gm, "")
  for (const term of ["consequence", "causalHistory", "NarrativeResidue", "narrative-residue", "Episode", "Beat", "Encounter", "NarrativeEntity", "WRO", "fetch(", "Date.", "Math.random", "canonicalize("]) {
    assert.ok(!code.includes(term), `worldHistoryEvidence.ts code must not reference ${term}`)
  }
})
