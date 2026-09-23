import assert from "node:assert/strict"
import { test } from "node:test"
import { createCertificationAuthority } from "./authority.ts"
import { exportAttestedCertifiedEpisodeContract, ATTESTED_CERTIFIED_EPISODE_CONTRACT_VERSION } from "./contract.ts"
import { CERTIFICATION_INVOCATION_CAPABILITIES } from "./policies.ts"
import { verifyAttestedEvidence } from "./verify.ts"
import type { AttestedCertificationRecord, CertificationRecord } from "./types.ts"
import type { CertifiedInterpretation } from "@avatark/narrative-interpretation"
import { COMPILER_IDENTITY, episodeCandidateFor, interpretationSubject } from "../test/realSubjects.ts"
import { CERTIFIER_ID, TestDoubleGrantSource, TestDoubleRefusalAudit, TestDoubleRegistry, testSigner, trustFor } from "../test/testDoubles.ts"

async function issuedChain() {
  const signer = testSigner()
  const registry = new TestDoubleRegistry()
  const grants = new TestDoubleGrantSource()
  grants.grant(CERTIFIER_ID, CERTIFICATION_INVOCATION_CAPABILITIES.INTERPRETATION)
  grants.grant(CERTIFIER_ID, CERTIFICATION_INVOCATION_CAPABILITIES.EPISODE)
  const trust = trustFor(signer)
  const authority = createCertificationAuthority({ grants, registry, refusalAudit: new TestDoubleRefusalAudit(), signer, trust })
  const invoker = { kind: "HUMAN" as const, userId: CERTIFIER_ID, authenticationMethod: "SUPABASE_SESSION" as const }
  const interpretation = await authority.invokeCertification({ authenticatedInvoker: invoker, subjectKind: "INTERPRETATION", subjectArtifact: interpretationSubject() })
  if (interpretation.outcome !== "ISSUED") throw new Error("unreachable")
  const episode = await authority.invokeCertification({
    authenticatedInvoker: invoker, subjectKind: "EPISODE",
    subjectArtifact: { episodeCandidate: episodeCandidateFor(interpretation.artifact as CertifiedInterpretation), compilerIdentity: COMPILER_IDENTITY, upstreamCertificationRecordId: interpretation.attested.record.certificationRecordId },
  })
  if (episode.outcome !== "ISSUED") throw new Error("unreachable")
  return { signer, registry, trust, interpretation, episode }
}

/** Re-sign a mutated record with the SAME trusted key, isolating the non-signature checks. */
function resigned(signer: ReturnType<typeof testSigner>, attested: AttestedCertificationRecord, mutate: (r: CertificationRecord) => void): AttestedCertificationRecord {
  const record = structuredClone(attested.record)
  mutate(record)
  return { record, attestation: signer.sign(record) }
}

test("VF1: a genuine chain verifies", async () => {
  const { trust, interpretation, episode } = await issuedChain()
  assert.equal(verifyAttestedEvidence(interpretation.attested, interpretation.artifact, "INTERPRETATION", trust).ok, true)
  assert.equal(verifyAttestedEvidence(episode.attested, episode.artifact, "EPISODE", trust).ok, true)
})

test("VF2 (J): an artifact modified after certification fails the digest check", async () => {
  const { trust, episode } = await issuedChain()
  const modified = { ...(episode.artifact as object), sourceCandidateId: "0".repeat(64) }
  const result = verifyAttestedEvidence(episode.attested, modified, "EPISODE", trust)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.failure, "SUBJECT_IDENTITY_MISMATCH")
})

test("VF3: the wrong subject kind is SUBJECT_IDENTITY_MISMATCH", async () => {
  const { trust, episode } = await issuedChain()
  const result = verifyAttestedEvidence(episode.attested, episode.artifact, "INTERPRETATION", trust)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.failure, "SUBJECT_IDENTITY_MISMATCH")
})

test("VF4 (N): an unsupported policy/version, even validly signed, is UNSUPPORTED_CERTIFICATION_POLICY", async () => {
  const { signer, trust, interpretation } = await issuedChain()
  for (const mutate of [(r: CertificationRecord) => { r.certificationPolicy.version = "2" }, (r: CertificationRecord) => { r.evaluatorIdentity.name = "some-other-evaluator" }]) {
    const result = verifyAttestedEvidence(resigned(signer, interpretation.attested, mutate), interpretation.artifact, "INTERPRETATION", trust)
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.failure, "UNSUPPORTED_CERTIFICATION_POLICY")
  }
})

test("VF5 (O): any state other than issued, even validly signed, is CERTIFICATION_NOT_IN_PERMITTED_STATE", async () => {
  const { signer, trust, interpretation } = await issuedChain()
  for (const state of ["withdrawn", "superseded", "revoked", "ISSUED", "pending"]) {
    const result = verifyAttestedEvidence(resigned(signer, interpretation.attested, (r) => { r.state = state }), interpretation.artifact, "INTERPRETATION", trust)
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.failure, "CERTIFICATION_NOT_IN_PERMITTED_STATE")
  }
})

test("VF6 (M): an unrecognized authority id is refused", async () => {
  const rogue = testSigner("rogue-key", "rogue-authority")
  const { interpretation } = await issuedChain()
  const forged = resigned(rogue, interpretation.attested, (r) => { r.certificationAuthority = { authorityId: "rogue-authority", keyId: "rogue-key" } })
  const result = verifyAttestedEvidence(forged, interpretation.artifact, "INTERPRETATION", trustFor(rogue))
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.failure, "UNRECOGNIZED_CERTIFICATION_AUTHORITY")
})

test("VF7: unexpected record fields and unsupported record format versions are refused", async () => {
  const { trust, interpretation } = await issuedChain()
  const extra = structuredClone(interpretation.attested) as unknown as { record: Record<string, unknown> }
  extra.record.publishApproved = true
  const r1 = verifyAttestedEvidence(extra, interpretation.artifact, "INTERPRETATION", trust)
  assert.equal(r1.ok, false)
  if (!r1.ok) assert.equal(r1.failure, "INVALID_CONTRACT")
  const v2 = structuredClone(interpretation.attested) as unknown as { record: Record<string, unknown> }
  v2.record.recordFormatVersion = "2"
  const r2 = verifyAttestedEvidence(v2, interpretation.artifact, "INTERPRETATION", trust)
  assert.equal(r2.ok, false)
  if (!r2.ok) assert.equal(r2.failure, "UNSUPPORTED_VERSION")
})

test("VF8: the attested v2 contract is exported from the registry with both verified records", async () => {
  const { registry, trust, interpretation, episode } = await issuedChain()
  const exported = await exportAttestedCertifiedEpisodeContract(registry, trust, episode.attested.record.certificationRecordId)
  assert.equal(exported.decision, "EXPORTED")
  if (exported.decision !== "EXPORTED") throw new Error("unreachable")
  assert.equal(exported.document.contractVersion, ATTESTED_CERTIFIED_EPISODE_CONTRACT_VERSION)
  assert.deepEqual(exported.document.certifiedEpisode, episode.artifact)
  assert.deepEqual(exported.document.upstreamInterpretation.certifiedInterpretation, interpretation.artifact)
  assert.deepEqual(exported.document.upstreamInterpretation.certificationRecord, interpretation.attested)
})

test("VF9: export refuses unknown records and interpretation records", async () => {
  const { registry, trust, interpretation } = await issuedChain()
  const unknown = await exportAttestedCertifiedEpisodeContract(registry, trust, "certrec_nope")
  assert.equal(unknown.decision, "REFUSED")
  const wrongKind = await exportAttestedCertifiedEpisodeContract(registry, trust, interpretation.attested.record.certificationRecordId)
  assert.equal(wrongKind.decision, "REFUSED")
})
