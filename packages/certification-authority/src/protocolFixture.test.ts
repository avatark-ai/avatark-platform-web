import assert from "node:assert/strict"
import { test } from "node:test"
import { createPublicKey } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { createKeyTrust } from "./attestation.ts"
import { canonicalSerialize } from "./canonicalJson.ts"
import { verifyAttestedEvidence } from "./verify.ts"
import { buildProtocolFixture, fixturePrivateKey } from "../test/protocolFixture.ts"

const FIXTURE_PATH = new URL("../test/fixtures/certification-protocol-fixture.v1.json", import.meta.url)

test("PF1: the issuer deterministically reproduces the committed cross-repository protocol fixture byte-for-byte", async () => {
  const fixture = await buildProtocolFixture()
  const serialized = `${JSON.stringify(fixture, null, 2)}\n`
  if (process.env.WRITE_CERTIFICATION_PROTOCOL_FIXTURE === "1") writeFileSync(FIXTURE_PATH, serialized)
  assert.equal(readFileSync(FIXTURE_PATH, "utf8"), serialized)
})

test("PF2: the committed fixture verifies with public material only", () => {
  const fixture = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"))
  const publicKey = createPublicKey({ key: Buffer.from(fixture.key.publicKeySpkiDerBase64, "base64"), format: "der", type: "spki" })
  const trust = createKeyTrust([{ keyId: fixture.key.keyId, authorityId: fixture.key.authorityId, algorithm: "Ed25519", publicKey }])
  assert.equal(canonicalSerialize(fixture.canonicalization.sample.input), fixture.canonicalization.sample.expectedCanonical)
  assert.equal(canonicalSerialize(fixture.interpretation.artifact), fixture.interpretation.expectedCanonicalArtifact)
  assert.equal(verifyAttestedEvidence(fixture.interpretation.certificationRecord, fixture.interpretation.artifact, "INTERPRETATION", trust).ok, true)
  assert.equal(verifyAttestedEvidence(fixture.episode.certificationRecord, fixture.episode.artifact, "EPISODE", trust).ok, true)
  assert.equal(fixture.episode.certificationRecord.record.upstreamCertification.certificationRecordId, fixture.interpretation.certificationRecord.record.certificationRecordId)
  assert.equal(fixture.expectedVerification, "VALID")
})

test("PF3: the fixture contains no private key material", () => {
  const text = readFileSync(FIXTURE_PATH, "utf8")
  assert.doesNotMatch(text, /PRIVATE KEY|pkcs8/i)
  // base64 of the Ed25519 PKCS#8 DER prefix: any encoded private key would start with it
  assert.equal(text.includes("MC4CAQAwBQYDK2VwBCIEI"), false)
  assert.equal(text.includes(fixturePrivateKey().export({ format: "der", type: "pkcs8" }).subarray(16).toString("base64")), false)
})
