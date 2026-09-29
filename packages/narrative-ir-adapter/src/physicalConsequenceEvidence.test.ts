import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { adaptVerifiedPhysicalConsequences } from "./physicalConsequenceEvidence.ts"
import type { PhysicalConsequenceAdaptationResult, PhysicalConsequenceFact } from "./physicalConsequenceEvidence.ts"

// Material. Compiler authority: avatark-ai/studiok-living-world-compiler,
// branch main, commit 0dc671d502cb2600fc4e2e41f5f9c30a2ebfdee9.
//
// GOLDEN_A, GOLDEN_B, GOLDEN_Q, GOLDEN_R -- published goldens
//   scripts/golden/fixtures__positive__<id>.json.canonical.json, byte-identical
//   (blob hashes below; digests from scripts/golden/digests.json).
//   A: two PHYSICAL (CONSUMER_CAUSED, CROSS_VISIT_SPAN_CAUSED).
//   B: two PHYSICAL (WORLD_PROCESS_CAUSED, and CONSUMER_CAUSED with an empty
//      worldStateDelta). Q: one RELATIONAL. R: one LONGITUDINAL.
// ATTR -- TEST-AUTHORED, not published compiler material: canonical bytes that
//   commit's compile() emitted for
//   test/fixtures/r3g3-12-physical-consequence-attribution-and-register.source.json.
//   No published artifact has a MULTI_CAUSAL or UNEXPLAINED PhysicalConsequence,
//   a C3_PERSONAL_CONSUMER one, or a non-PHYSICAL Consequence sharing a
//   PHYSICAL one's trigger, attribution, timing and persistence.
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
const GOLDEN_B = {
  file: "compiler-golden-B-non-intervention-independent-evolution.canonical.json",
  blob: "6b90432a019cfbac25581ad7e9dc048672c2a484",
  fixtureId: "B-non-intervention-independent-evolution",
  digest: "4b6fa8c0773830e5a5876b8d7b6417e522768bb571ce8844346f0b5c74e74263",
}
const GOLDEN_Q = {
  file: "compiler-golden-Q-relational-consequence-care-without-mutation.canonical.json",
  blob: "e0a4c2cfee602a612db78989dedf33ac6d9a8c2c",
  fixtureId: "Q-relational-consequence-care-without-mutation",
  digest: "d823697e5cfe271a56eca8b0a6dee9405c4b20204a8ad5694fbcd09fc4eb1d61",
}
const GOLDEN_R = {
  file: "compiler-golden-R-longitudinal-consequence-chain-transform.canonical.json",
  blob: "666575b5860eeb91a7c778b7d65e25218637cf4d",
  fixtureId: "R-longitudinal-consequence-chain-transform",
  digest: "cf06daff16669ea88c7ff4127ea8f3f0dd5abcbd88c556c8decdf58df6f2b72a",
}
const ATTR = {
  file: "r3g3-12-physical-consequence-attribution-and-register.canonical.json",
  blob: "406cce7a1f149fdd6c8795f7d21bb6e747b8c80c",
  fixtureId: "r3g3-12-physical-consequence-attribution-and-register",
  digest: "ca3078d464445adf4c0cad5b02b8cd26bdc814b5f47f519cb0f8a560581f4c01",
}
type Material = typeof GOLDEN_A
const ALL = [GOLDEN_A, GOLDEN_B, GOLDEN_Q, GOLDEN_R, ATTR]
const PHYSICAL_MATERIAL = [GOLDEN_A, GOLDEN_B, ATTR]
const input = (m: Material) => ({ artifact: { fixtureId: m.fixtureId, digest: m.digest }, canonicalBytes: raw(m.file).toString("utf8") })
const canonicalDocs = (m: Material): Record<string, Record<string, unknown>> => JSON.parse(raw(m.file).toString("utf8")).artifact.documents
const reason = (r: PhysicalConsequenceAdaptationResult) => (r.decision === "REFUSED" ? r.reason : "ADAPTED")

function adapted(m: Material) {
  const result = adaptVerifiedPhysicalConsequences(input(m))
  assert.equal(result.decision, "ADAPTED", JSON.stringify(result))
  if (result.decision !== "ADAPTED") throw new Error("unreachable")
  return result
}
const facts = (m: Material) => adapted(m).physicalConsequences
const factFor = (m: Material, key: string): PhysicalConsequenceFact => facts(m).find((f) => f.consequenceKey === key)!

// Bytes that pass verifyCompiledArtifact() (their digest is their own) but
// were never accepted by the compiler: they exercise the adapter's own
// refusal of verified-but-malformed documents.
function verifiedDocuments(documents: Record<string, unknown>) {
  const bytes = JSON.stringify({ canonicalizationVersion: "0.1.0", artifact: { documents, fixtureId: "malformed" } })
  return { artifact: { fixtureId: "malformed", digest: sha256(bytes) }, canonicalBytes: bytes }
}
const physicalDoc = (): Record<string, unknown> => ({
  causalAttribution: { kind: "CONSUMER_CAUSED" },
  evidenceTiming: "IMMEDIATE",
  id: "consequence/p",
  irVersion: "0.3.0",
  persistence: { authority: "C2_SHARED_EMERGENT", lifetime: "SEASONAL" },
  register: "PHYSICAL",
  triggerId: "action/a",
  worldStateDelta: { flow: "cleared" },
})

test("PC0: fixture bytes are exactly the recorded compiler output", () => {
  for (const m of ALL) {
    const bytes = raw(m.file)
    assert.equal(blobOf(bytes), m.blob, m.file)
    assert.equal(sha256(bytes.toString("utf8")), m.digest, m.file)
  }
})

test("PC1: verified PhysicalConsequences adapt under their canonical document-map identity", () => {
  assert.deepEqual(facts(GOLDEN_A).map((f) => [f.kind, f.consequenceKey, f.register]), [
    ["PHYSICAL_CONSEQUENCE", "consequence/delayed-downstream-improvement", "PHYSICAL"],
    ["PHYSICAL_CONSEQUENCE", "consequence/immediate-flow-change", "PHYSICAL"],
  ])
  for (const m of PHYSICAL_MATERIAL) {
    const docs = canonicalDocs(m)
    for (const f of facts(m)) assert.equal(docs[f.consequenceKey].id, f.consequenceKey)
  }
})

test("PC2: every authoritative field is retained verbatim, with the verified source", () => {
  for (const m of PHYSICAL_MATERIAL) {
    const docs = canonicalDocs(m)
    for (const f of facts(m)) {
      const doc = docs[f.consequenceKey]
      assert.deepEqual(f.source, { fixtureId: m.fixtureId, digest: m.digest, canonicalizationVersion: "0.1.0" })
      assert.deepEqual(Object.keys(f).sort(), ["causalAttribution", "consequenceKey", "evidenceTiming", "irVersion", "kind", "persistence", "register", "source", "triggerId", "worldStateDelta"])
      for (const field of ["irVersion", "register", "triggerId", "causalAttribution", "evidenceTiming", "persistence", "worldStateDelta"] as const) {
        assert.deepEqual(f[field], doc[field], `${f.consequenceKey}.${field}`)
      }
    }
  }
  const personal = factFor(ATTR, "consequence/test-unexplained-stone-shift")
  assert.deepEqual(personal.persistence, { authority: "C3_PERSONAL_CONSUMER", lifetime: "SHORT" })
})

test("PC3: causalAttribution is copied exactly as the compiler canonicalized it, for every attribution kind present", () => {
  const seen = new Map<string, unknown>()
  for (const m of PHYSICAL_MATERIAL) {
    const bytes = raw(m.file).toString("utf8")
    for (const f of facts(m)) {
      const canonical = canonicalDocs(m)[f.consequenceKey].causalAttribution
      assert.equal(JSON.stringify(f.causalAttribution), JSON.stringify(canonical))
      assert.ok(bytes.includes(`"causalAttribution":${JSON.stringify(f.causalAttribution)}`))
      seen.set(String(f.causalAttribution.kind), f.causalAttribution)
    }
  }
  assert.deepEqual([...seen.keys()].sort(), ["CONSUMER_CAUSED", "CROSS_VISIT_SPAN_CAUSED", "MULTI_CAUSAL", "UNEXPLAINED", "WORLD_PROCESS_CAUSED"])
  // The source authored ["WORLD_PROCESS_CAUSED", "CONSUMER_CAUSED"]; the
  // compiler's canonical form is sorted (STRING_SORTED), and the adapter
  // carries that canonical form -- it neither re-sorts, ranks nor collapses it.
  assert.deepEqual(seen.get("MULTI_CAUSAL"), { contributingCauses: ["CONSUMER_CAUSED", "WORLD_PROCESS_CAUSED"], kind: "MULTI_CAUSAL" })
})

test("PC4: worldStateDelta is transported, including an empty and a nested delta, and never applied", () => {
  assert.deepEqual(factFor(GOLDEN_B, "consequence/non-action-standing-record").worldStateDelta, {})
  assert.deepEqual(factFor(ATTR, "consequence/test-multi-causal-bank-collapse").worldStateDelta, { bank: { extent: 3, state: "collapsed" } })
  const result = adapted(GOLDEN_A)
  assert.deepEqual(Object.keys(result).sort(), ["decision", "physicalConsequences", "source"])
  const json = JSON.stringify(result)
  for (const stateField of ["currentPhysicalState", "currentEcologicalState", "place-memory/", "causalHistory"]) {
    assert.ok(!json.includes(stateField), `adaptation must not produce or touch ${stateField}`)
  }
  // No shared state: mutating one result's delta cannot leak into a later adaptation.
  ;(result.physicalConsequences[0].worldStateDelta as Record<string, unknown>).soilMoisture = "tampered"
  assert.deepEqual(factFor(GOLDEN_A, "consequence/delayed-downstream-improvement").worldStateDelta, { soilMoisture: "improved" })
})

test("PC5: repeated evaluation is byte-identical", () => {
  for (const m of ALL) {
    const first = JSON.stringify(adaptVerifiedPhysicalConsequences(input(m)))
    for (let i = 0; i < 5; i++) assert.equal(JSON.stringify(adaptVerifiedPhysicalConsequences(input(m))), first)
  }
})

test("PC6: RELATIONAL and LONGITUDINAL Consequences never adapt as PHYSICAL and carry no personal fields across", () => {
  for (const m of [GOLDEN_Q, GOLDEN_R]) {
    const docs = canonicalDocs(m)
    assert.ok(Object.keys(docs).some((k) => k.startsWith("consequence/")), m.file)
    assert.deepEqual(facts(m), [])
    const json = JSON.stringify(adapted(m))
    for (const field of ["personalHistoryEntryId", "relationshipChainId", "nextChainState", "RELATIONAL", "LONGITUDINAL"]) {
      assert.ok(!json.includes(field), `${m.file}: output must not carry ${field}`)
    }
  }
})

test("PC7: register confusion -- a structurally similar RELATIONAL Consequence beside PHYSICAL ones does not cross the firewall", () => {
  const docs = canonicalDocs(ATTR)
  const lookalike = docs["consequence/test-relational-lookalike"]
  const physical = docs["consequence/test-unexplained-stone-shift"]
  for (const shared of ["triggerId", "causalAttribution", "evidenceTiming", "persistence", "irVersion"]) {
    assert.deepEqual(lookalike[shared], physical[shared], shared)
  }
  assert.deepEqual(facts(ATTR).map((f) => f.consequenceKey), ["consequence/test-multi-causal-bank-collapse", "consequence/test-unexplained-stone-shift"])
  assert.ok(!JSON.stringify(adapted(ATTR)).includes("test-relational-lookalike"))
})

test("PC8: a digest mismatch produces no PhysicalConsequence evidence", () => {
  const wrongDigest = adaptVerifiedPhysicalConsequences({ ...input(GOLDEN_A), artifact: { fixtureId: GOLDEN_A.fixtureId, digest: GOLDEN_B.digest } })
  assert.equal(reason(wrongDigest), "DIGEST_MISMATCH")
  assert.ok(!("physicalConsequences" in wrongDigest))
  const reattributed = input(GOLDEN_A).canonicalBytes.replace('"causalAttribution":{"kind":"CONSUMER_CAUSED"}', '"causalAttribution":{"kind":"WORLD_PROCESS_CAUSED"}')
  assert.notEqual(reattributed, input(GOLDEN_A).canonicalBytes)
  assert.equal(reason(adaptVerifiedPhysicalConsequences({ ...input(GOLDEN_A), canonicalBytes: reattributed })), "DIGEST_MISMATCH")
  const reapplied = input(GOLDEN_A).canonicalBytes.replace('"worldStateDelta":{"waterFlow":"cleared"}', '"worldStateDelta":{"waterFlow":"blocked"}')
  assert.notEqual(reapplied, input(GOLDEN_A).canonicalBytes)
  assert.equal(reason(adaptVerifiedPhysicalConsequences({ ...input(GOLDEN_A), canonicalBytes: reapplied })), "DIGEST_MISMATCH")
})

test("PC9: an unsupported canonicalization version produces no PhysicalConsequence evidence", () => {
  const future = input(GOLDEN_A).canonicalBytes.replace('"canonicalizationVersion":"0.1.0"', '"canonicalizationVersion":"0.2.0"')
  const result = adaptVerifiedPhysicalConsequences({ artifact: { fixtureId: GOLDEN_A.fixtureId, digest: sha256(future) }, canonicalBytes: future })
  assert.equal(reason(result), "UNSUPPORTED_CANONICALIZATION_VERSION")
})

test("PC10: caller objects beside the verified bytes cannot influence the evidence", () => {
  const clean = adapted(GOLDEN_A)
  const forged = {
    ...input(GOLDEN_A),
    canonicalArtifact: { documents: { "consequence/forged": { ...physicalDoc(), id: "consequence/forged" } } },
    physicalConsequences: [{ consequenceKey: "consequence/forged", causalAttribution: { kind: "NARRATIVE_CAUSED" } }],
    causalAttribution: { kind: "NARRATIVE_CAUSED" },
  }
  const result = adaptVerifiedPhysicalConsequences(forged)
  assert.deepEqual(result, clean)
  assert.ok(!JSON.stringify(result).includes("forged") && !JSON.stringify(result).includes("NARRATIVE_CAUSED"))
})

test("PC11: verified-but-malformed Consequences are refused whole, never partially adapted or reinterpreted", () => {
  const without = (field: string) => {
    const doc = physicalDoc()
    delete doc[field]
    return doc
  }
  const cases: Array<[string, Record<string, unknown>]> = [
    ["unknown register", { ...physicalDoc(), register: "SPIRITUAL" }],
    ["lower-case register", { ...physicalDoc(), register: "physical" }],
    ["non-string register", { ...physicalDoc(), register: 1 }],
    ["missing register", without("register")],
    ["missing causalAttribution", without("causalAttribution")],
    ["causalAttribution not an object", { ...physicalDoc(), causalAttribution: "CONSUMER_CAUSED" }],
    ["causalAttribution without kind", { ...physicalDoc(), causalAttribution: {} }],
    ["missing worldStateDelta", without("worldStateDelta")],
    ["worldStateDelta not an object", { ...physicalDoc(), worldStateDelta: ["cleared"] }],
    ["missing triggerId", without("triggerId")],
    ["missing evidenceTiming", without("evidenceTiming")],
    ["missing persistence", without("persistence")],
    ["persistence without lifetime", { ...physicalDoc(), persistence: { authority: "C2_SHARED_EMERGENT" } }],
    ["missing irVersion", without("irVersion")],
    ["id is not its key", { ...physicalDoc(), id: "consequence/other" }],
    ["PHYSICAL carrying personalHistoryEntryId", { ...physicalDoc(), personalHistoryEntryId: "declared/x" }],
    ["PHYSICAL carrying relationshipChainId", { ...physicalDoc(), relationshipChainId: "relationship/x", nextChainState: {} }],
    ["PHYSICAL carrying consumerId", { ...physicalDoc(), consumerId: "consumer/x" }],
    ["PHYSICAL carrying a narrative confidence", { ...physicalDoc(), confidence: 0.9 }],
  ]
  for (const [label, doc] of cases) {
    const result = adaptVerifiedPhysicalConsequences(verifiedDocuments({ "consequence/p": doc, "consequence/q": { ...physicalDoc(), id: "consequence/q" } }))
    assert.equal(reason(result), "MALFORMED_HISTORY_DOCUMENT", label)
    assert.ok(!("physicalConsequences" in result), label)
  }
  const ok = adaptVerifiedPhysicalConsequences(verifiedDocuments({ "consequence/p": physicalDoc() }))
  assert.equal(reason(ok), "ADAPTED")
})

test("PC12: the adaptation source makes no causal, personal, residue, episode or runtime-state move", () => {
  const source = readFileSync(path.join(here, "physicalConsequenceEvidence.ts"), "utf8")
  const specifiers = [...source.matchAll(/(?:from\s+|require\()\s*["']([^"']+)["']/g)].map((m) => m[1])
  assert.ok(specifiers.every((s) => s.startsWith("./")), JSON.stringify(specifiers))
  const code = source.replace(/\/\/.*$/gm, "")
  for (const term of [
    // no causal interpretation: attribution values are never inspected
    "CONSUMER_CAUSED", "WORLD_PROCESS_CAUSED", "OTHER_ENTITY_CAUSED", "MULTI_CAUSAL", "CROSS_VISIT_SPAN_CAUSED", "UNEXPLAINED", "contributingCauses", "CAUSAL_ATTRIBUTION",
    // no personal / relationship history
    "PERSONAL_VISITOR_HISTORY", "personalHistoryEntryId", "relationshipChainId", "nextChainState", "consumerId", "history-pool",
    // no residue, causalHistory, episode ownership, WRO or R3-G5
    "NarrativeResidue", "narrative-residue", "causalHistory", "Episode", "Beat", "Encounter", "NarrativeEntity", "WRO", "evidenceProvenance",
    // no world-state application, I/O, time or randomness
    "currentPhysicalState", "Object.assign", "fetch(", "Date.", "Math.random", "canonicalize(",
  ]) {
    assert.ok(!code.includes(term), `physicalConsequenceEvidence.ts code must not reference ${term}`)
  }
})
