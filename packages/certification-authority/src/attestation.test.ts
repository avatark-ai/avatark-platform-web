import assert from "node:assert/strict"
import { test } from "node:test"
import { generateKeyPairSync } from "node:crypto"
import { certificationRecordSignedBytes, CERTIFICATION_RECORD_SIGNATURE_DOMAIN, createEd25519Signer, createKeyTrust, verifyRecordAttestation } from "./attestation.ts"
import { canonicalBytes } from "./canonicalJson.ts"
import { CERTIFICATION_AUTHORITY_ID } from "./policies.ts"
import type { CertificationRecord } from "./types.ts"
import { testSigner, trustFor } from "../test/testDoubles.ts"

function sampleRecord(keyId: string, authorityId = CERTIFICATION_AUTHORITY_ID): CertificationRecord {
  return {
    recordFormatVersion: "1",
    certificationRecordId: "certrec_3f0b7d8e-2c61-4a4b-9d1e-5b8f0c7a6e21",
    subjectKind: "INTERPRETATION",
    subjectId: "a".repeat(64),
    subjectDigest: { algorithm: "SHA-256", canonicalization: "AVATARK_CANONICAL_JSON_V1", value: "b".repeat(64) },
    certificationPolicy: { name: "structural-provenance-identity-policy", version: "1" },
    evaluatorIdentity: { name: "narrative-interpretation-certification", version: "0.1.0" },
    certificationAuthority: { authorityId, keyId },
    invoker: { kind: "HUMAN", userId: "11111111-1111-4111-8111-111111111111", authenticationMethod: "SUPABASE_SESSION" },
    invocationGrant: { grantId: "g1", capability: "certification.invoke.interpretation", scopeType: "platform", scopeId: null, grantedBy: "22222222-2222-4222-8222-222222222222", grantedAt: "2026-09-23T00:00:00.000Z" },
    upstreamCertification: null,
    sourceProvenance: { candidateId: "c".repeat(64), interpretationInputIdentity: "d".repeat(64) },
    sourceContext: { projectId: null, worldId: null },
    issuedAt: "2026-09-23T12:00:00.000Z",
    state: "issued",
  }
}

test("AT1: signed bytes are the domain prefix followed by the canonical record", () => {
  const record = sampleRecord("k1")
  assert.deepEqual(certificationRecordSignedBytes(record), Buffer.concat([Buffer.from(CERTIFICATION_RECORD_SIGNATURE_DOMAIN), canonicalBytes(record)]))
})

test("AT2: a signed record verifies against its trusted public key", () => {
  const signer = testSigner("k1")
  const record = sampleRecord("k1")
  const attested = { record, attestation: signer.sign(record) }
  assert.equal(attested.attestation.algorithm, "Ed25519")
  assert.equal(Buffer.from(attested.attestation.signature, "base64url").length, 64)
  assert.equal(verifyRecordAttestation(attested, trustFor(signer)).ok, true)
})

test("AT3 (K): any modification of a signed record fails signature verification", () => {
  const signer = testSigner("k1")
  const record = sampleRecord("k1")
  const attested = { record, attestation: signer.sign(record) }
  const mutations: Array<(r: CertificationRecord) => void> = [
    (r) => { r.subjectDigest.value = "c".repeat(64) },
    (r) => { r.subjectId = "e".repeat(64) },
    (r) => { r.invoker.userId = "33333333-3333-4333-8333-333333333333" },
    (r) => { r.invocationGrant.grantId = "g2" },
    (r) => { r.certificationPolicy.version = "2" },
    (r) => { r.state = "withdrawn" },
    (r) => { r.issuedAt = "2026-09-24T12:00:00.000Z" },
    (r) => { r.upstreamCertification = { certificationRecordId: "x", subjectKind: "INTERPRETATION", subjectId: "y", subjectDigest: r.subjectDigest } },
  ]
  for (const mutate of mutations) {
    const tampered = structuredClone(attested)
    mutate(tampered.record)
    const result = verifyRecordAttestation(tampered, trustFor(signer))
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.failure, "FORGED_OR_INVALID_ATTESTATION")
  }
})

test("AT4 (L): an unknown key id is refused; a distrusted (compromised) key id is refused", () => {
  const signer = testSigner("k1")
  const other = testSigner("k2")
  const record = sampleRecord("k1")
  const attested = { record, attestation: signer.sign(record) }
  const unknown = verifyRecordAttestation(attested, trustFor(other))
  assert.equal(unknown.ok, false)
  if (!unknown.ok) assert.equal(unknown.failure, "FORGED_OR_INVALID_ATTESTATION")
  const trust = createKeyTrust(trustFor(signer).trustedKeys, ["k1"])
  const distrusted = verifyRecordAttestation(attested, trust)
  assert.equal(distrusted.ok, false)
  if (!distrusted.ok) assert.match(distrusted.detail, /distrusted/)
})

test("AT5: a signature from a different key presented under a trusted key id is refused", () => {
  const trusted = testSigner("k1")
  const attacker = testSigner("k1")
  const record = sampleRecord("k1")
  const forged = { record, attestation: attacker.sign(record) }
  assert.equal(verifyRecordAttestation(forged, trustFor(trusted)).ok, false)
})

test("AT6: attestation keyId must equal the signed record keyId; algorithm is not negotiable", () => {
  const signer = testSigner("k1")
  const record = sampleRecord("k1")
  const attested = { record, attestation: signer.sign(record) }
  assert.equal(verifyRecordAttestation({ ...attested, attestation: { ...attested.attestation, keyId: "k2" } }, trustFor(signer)).ok, false)
  assert.equal(verifyRecordAttestation({ ...attested, attestation: { ...attested.attestation, algorithm: "HS256" as "Ed25519" } }, trustFor(signer)).ok, false)
})

test("AT7 (M): a trusted key used for a record naming another authority is UNRECOGNIZED_CERTIFICATION_AUTHORITY", () => {
  const rogue = testSigner("k1", "some-other-authority")
  const record = sampleRecord("k1", "some-other-authority")
  const attested = { record, attestation: rogue.sign(record) }
  const trust = createKeyTrust([{ keyId: "k1", authorityId: CERTIFICATION_AUTHORITY_ID, algorithm: "Ed25519", publicKey: rogue.publicKey }])
  const result = verifyRecordAttestation(attested, trust)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.failure, "UNRECOGNIZED_CERTIFICATION_AUTHORITY")
})

test("AT8: the signer never exposes its private key; public material cannot create a signer", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519")
  const signer = createEd25519Signer({ authorityId: CERTIFICATION_AUTHORITY_ID, keyId: "k1", privateKey })
  const pkcs8 = privateKey.export({ format: "der", type: "pkcs8" }).toString("base64")
  assert.equal(JSON.stringify(signer).includes(pkcs8), false)
  assert.deepEqual(Object.keys(signer).sort(), ["authorityId", "keyId", "publicKey", "sign"])
  assert.equal(signer.publicKey.type, "public")
  assert.throws(() => createEd25519Signer({ authorityId: CERTIFICATION_AUTHORITY_ID, keyId: "k1", privateKey: publicKey }))
  const { privateKey: rsa } = generateKeyPairSync("rsa", { modulusLength: 1024 })
  assert.throws(() => createEd25519Signer({ authorityId: CERTIFICATION_AUTHORITY_ID, keyId: "k1", privateKey: rsa }))
})

test("AT9: a signer refuses to sign a record naming a different key or authority", () => {
  const signer = testSigner("k1")
  assert.throws(() => signer.sign(sampleRecord("k2")))
  assert.throws(() => signer.sign(sampleRecord("k1", "other")))
})
