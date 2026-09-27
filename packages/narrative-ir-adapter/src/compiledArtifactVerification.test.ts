import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { SUPPORTED_CANONICALIZATION_VERSIONS, verifyCompiledArtifact } from "./compiledArtifactVerification.ts"
import { artifactReferenceFromCanonical } from "./translation/artifactReferenceFromCanonical.ts"
import r06ProtocolFixture from "../test/fixtures/r06-living-vrindavan-protocol-identity.json" with { type: "json" }

// Authoritative positive material: a byte-for-byte copy of the compiler's own
// golden canonical output for fixture C, from the published compiler.
//   repository: avatark-ai/studiok-living-world-compiler, branch main
//   commit:     0dc671d502cb2600fc4e2e41f5f9c30a2ebfdee9
//   path:       scripts/golden/fixtures__positive__C-repeated-pattern-gap-perceptible-absence.json.canonical.json
//   git blob:   364d2329ca33f081e2ea6c6736a6b22cea1dc42f
//   digest:     scripts/golden/digests.json["fixtures/positive/C-repeated-pattern-gap-perceptible-absence.json"]
// Not sourced from the quarantined sibling compiler lineage.
const GOLDEN_BLOB = "364d2329ca33f081e2ea6c6736a6b22cea1dc42f"
const GOLDEN_FIXTURE_ID = "C-repeated-pattern-gap-perceptible-absence"
const GOLDEN_DIGEST = "7a823c5abc98bc21c53f4be3ea7444625ca89b7baa679731ab514ba77d84efba"
const here = path.dirname(fileURLToPath(import.meta.url))
const goldenRaw = readFileSync(path.join(here, "..", "test", "fixtures", "compiler-golden-C-repeated-pattern-gap-perceptible-absence.canonical.json"))
const goldenBytes = goldenRaw.toString("utf8")
const golden = { fixtureId: GOLDEN_FIXTURE_ID, digest: GOLDEN_DIGEST }
const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex")

function refusal(result: ReturnType<typeof verifyCompiledArtifact>): string {
  return result.decision === "REFUSED" ? result.reason : "VERIFIED"
}

test("V0: the positive fixture is byte-identical to the compiler's published golden (git blob hash)", () => {
  const blob = createHash("sha1").update(`blob ${goldenRaw.length}\0`).update(goldenRaw).digest("hex")
  assert.equal(blob, GOLDEN_BLOB)
})

test("V1: an authoritative compiler artifact verifies against its published digest", () => {
  const result = verifyCompiledArtifact({ artifact: golden, canonicalBytes: goldenBytes })
  assert.equal(result.decision, "VERIFIED")
  if (result.decision === "VERIFIED") {
    assert.deepEqual(result.artifact, golden)
    assert.equal(result.canonicalizationVersion, "0.1.0")
    assert.equal(result.canonicalArtifact.fixtureId, GOLDEN_FIXTURE_ID)
  }
})

test("V2: a one-value semantic mutation of the canonical bytes is a DIGEST_MISMATCH", () => {
  assert.ok(goldenBytes.includes('"confidence":0.7'))
  const mutated = goldenBytes.replace('"confidence":0.7', '"confidence":0.8')
  assert.equal(refusal(verifyCompiledArtifact({ artifact: golden, canonicalBytes: mutated })), "DIGEST_MISMATCH")
})

test("V2b: a representational change the compiler would never emit (trailing newline) is a DIGEST_MISMATCH", () => {
  assert.equal(refusal(verifyCompiledArtifact({ artifact: golden, canonicalBytes: goldenBytes + "\n" })), "DIGEST_MISMATCH")
})

test("V3: a mutated claimed digest is a DIGEST_MISMATCH", () => {
  const last = GOLDEN_DIGEST.at(-1) === "0" ? "1" : "0"
  const wrong = { ...golden, digest: GOLDEN_DIGEST.slice(0, -1) + last }
  assert.equal(refusal(verifyCompiledArtifact({ artifact: wrong, canonicalBytes: goldenBytes })), "DIGEST_MISMATCH")
})

test("V4: malformed artifact references are refused", () => {
  const cases: unknown[] = [
    undefined,
    null,
    "not-an-object",
    { canonicalBytes: goldenBytes },
    { artifact: { digest: GOLDEN_DIGEST }, canonicalBytes: goldenBytes },
    { artifact: { fixtureId: "", digest: GOLDEN_DIGEST }, canonicalBytes: goldenBytes },
    { artifact: { fixtureId: GOLDEN_FIXTURE_ID, digest: "test-fixture-digest-not-canonical" }, canonicalBytes: goldenBytes },
    { artifact: { fixtureId: GOLDEN_FIXTURE_ID, digest: GOLDEN_DIGEST.toUpperCase() }, canonicalBytes: goldenBytes },
    { artifact: { fixtureId: GOLDEN_FIXTURE_ID, digest: GOLDEN_DIGEST.slice(1) }, canonicalBytes: goldenBytes },
  ]
  for (const input of cases) {
    assert.equal(refusal(verifyCompiledArtifact(input)), "MALFORMED_ARTIFACT_REFERENCE", JSON.stringify(input)?.slice(0, 80))
  }
})

test("V5: an unsupported canonicalization version is refused even when its digest is self-consistent", () => {
  const future = goldenBytes.replace('"canonicalizationVersion":"0.1.0"', '"canonicalizationVersion":"0.2.0"')
  assert.notEqual(future, goldenBytes)
  const result = verifyCompiledArtifact({ artifact: { fixtureId: GOLDEN_FIXTURE_ID, digest: sha256(future) }, canonicalBytes: future })
  assert.equal(refusal(result), "UNSUPPORTED_CANONICALIZATION_VERSION")
  assert.deepEqual(SUPPORTED_CANONICALIZATION_VERSIONS, ["0.1.0"])
})

test("V6: missing verification material is refused", () => {
  for (const canonicalBytes of [undefined, null, "", 42, { artifact: {} }]) {
    assert.equal(refusal(verifyCompiledArtifact({ artifact: golden, canonicalBytes })), "MISSING_VERIFICATION_MATERIAL")
  }
})

test("V6b: canonical material that is not a compiler payload is refused", () => {
  for (const bytes of ["not json", "[]", '{"artifact":{}}', '{"canonicalizationVersion":"0.1.0"}']) {
    assert.equal(refusal(verifyCompiledArtifact({ artifact: { fixtureId: GOLDEN_FIXTURE_ID, digest: sha256(bytes) }, canonicalBytes: bytes })), "MALFORMED_CANONICAL_MATERIAL")
  }
})

test("V6c: verified bytes for a different artifact than the claimed fixtureId are a SOURCE_IDENTITY_MISMATCH", () => {
  const result = verifyCompiledArtifact({ artifact: { fixtureId: "some-other-fixture", digest: GOLDEN_DIGEST }, canonicalBytes: goldenBytes })
  assert.equal(refusal(result), "SOURCE_IDENTITY_MISMATCH")
})

test("V7: verification is deterministic across repeated calls", () => {
  const inputs: unknown[] = [
    { artifact: golden, canonicalBytes: goldenBytes },
    { artifact: golden, canonicalBytes: goldenBytes + " " },
    { artifact: golden },
    {},
  ]
  for (const input of inputs) {
    const first = JSON.stringify(verifyCompiledArtifact(input))
    for (let i = 0; i < 5; i++) assert.equal(JSON.stringify(verifyCompiledArtifact(input)), first)
  }
})

test("V8: the verifier's only import besides local types is node:crypto -- no network, filesystem, database, clock, or randomness", () => {
  const source = readFileSync(path.join(here, "compiledArtifactVerification.ts"), "utf8")
  const specifiers = [...source.matchAll(/(?:from\s+|require\()\s*["']([^"']+)["']/g)].map((m) => m[1])
  assert.deepEqual(specifiers.sort(), ["./canonicalNarrativeIR.ts", "node:crypto"])
  const code = source.replace(/\/\/.*$/gm, "")
  for (const forbidden of ["fetch(", "process.", "Date.", "Math.random", "readFile", "writeFile", "require(", "globalThis"]) {
    assert.ok(!code.includes(forbidden), `verifier code must not use ${forbidden}`)
  }
})

test("V9: the R06 protocol fixture is not promoted to verified authoritative evidence", () => {
  const identity = { fixtureId: r06ProtocolFixture.fixtureId, digest: r06ProtocolFixture.digest }
  // It carries no canonical bytes, so there is nothing to verify.
  assert.equal(refusal(verifyCompiledArtifact({ artifact: identity })), "MISSING_VERIFICATION_MATERIAL")
  // Authoritative bytes for a different artifact cannot vouch for its digest.
  assert.equal(refusal(verifyCompiledArtifact({ artifact: identity, canonicalBytes: goldenBytes })), "DIGEST_MISMATCH")
  assert.equal(r06ProtocolFixture._provenanceClass, "PROTOCOL_TEST_FIXTURE_NON_AUTHORITATIVE_SOURCE")
})

test("V10: a verified identity still flows into ArtifactReference unchanged", () => {
  const result = verifyCompiledArtifact({ artifact: golden, canonicalBytes: goldenBytes })
  assert.equal(result.decision, "VERIFIED")
  if (result.decision !== "VERIFIED") return
  const reference = artifactReferenceFromCanonical(result.artifact, { id: "runtime-requirements/occupancy-pattern", requires: ["EXPECTED_STATE_COMPARISON"] }, "place-memory/waiting-hollow")
  assert.deepEqual(reference, {
    sourceId: GOLDEN_FIXTURE_ID,
    digest: GOLDEN_DIGEST,
    ruleId: "runtime-requirements/occupancy-pattern",
    eventId: "place-memory/waiting-hollow",
  })
})
