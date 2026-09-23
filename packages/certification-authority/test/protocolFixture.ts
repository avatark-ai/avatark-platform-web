// Builds the cross-repository certification protocol fixture
// (PLT-ADR-015 §5: "a cross-repository protocol fixture, mirroring the G10K
// precedent") with the REAL Authority code path.
//
// TEST-ONLY KEY. The fixture key is derived from a public, fixed seed so
// Ed25519's deterministic signatures can be pinned byte-for-byte. It is not
// a secret, is labelled as such in its key id, and no runtime trust
// configuration ever contains it (trust is env-configured and empty by
// default in every repository).
import { createHash, createPrivateKey, createPublicKey } from "node:crypto"
import { createCertificationAuthority } from "../src/authority.ts"
import { certificationRecordSignedBytes, createEd25519Signer, createKeyTrust } from "../src/attestation.ts"
import { canonicalSerialize } from "../src/canonicalJson.ts"
import { exportAttestedCertifiedEpisodeContract } from "../src/contract.ts"
import { CERTIFICATION_AUTHORITY_ID, CERTIFICATION_INVOCATION_CAPABILITIES } from "../src/policies.ts"
import { COMPILER_IDENTITY, contentEpisodeFor, interpretationSubject } from "./realSubjects.ts"
import { ADMIN_ID, CERTIFIER_ID, TestDoubleGrantSource, TestDoubleRefusalAudit, TestDoubleRegistry } from "./testDoubles.ts"
import type { CertifiedInterpretation } from "@avatark/narrative-interpretation"

export const FIXTURE_KEY_ID = "protocol-fixture-TEST-ONLY-key-1"
const FIXTURE_SEED_LABEL = "avatark.certification.protocol-fixture.v1.TEST-ONLY-NOT-A-SECRET"
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex")

export function fixturePrivateKey() {
  const seed = createHash("sha256").update(FIXTURE_SEED_LABEL).digest()
  return createPrivateKey({ key: Buffer.concat([ED25519_PKCS8_PREFIX, seed]), format: "der", type: "pkcs8" })
}

export async function buildProtocolFixture() {
  const privateKey = fixturePrivateKey()
  const publicKey = createPublicKey(privateKey)
  const signer = createEd25519Signer({ authorityId: CERTIFICATION_AUTHORITY_ID, keyId: FIXTURE_KEY_ID, privateKey })
  const trust = createKeyTrust([{ keyId: FIXTURE_KEY_ID, authorityId: CERTIFICATION_AUTHORITY_ID, algorithm: "Ed25519", publicKey }])
  const registry = new TestDoubleRegistry()
  const grants = new TestDoubleGrantSource()
  grants.grant(CERTIFIER_ID, CERTIFICATION_INVOCATION_CAPABILITIES.INTERPRETATION)
  grants.grant(CERTIFIER_ID, CERTIFICATION_INVOCATION_CAPABILITIES.EPISODE)
  const recordIds = ["certrec_00000000-0000-4000-8000-000000000001", "certrec_00000000-0000-4000-8000-000000000002"]
  const authority = createCertificationAuthority({
    grants, registry, refusalAudit: new TestDoubleRefusalAudit(), signer, trust,
    now: () => new Date("2026-09-23T12:00:00.000Z"),
    newRecordId: () => recordIds.shift()!,
  })
  const invoker = { kind: "HUMAN" as const, userId: CERTIFIER_ID, authenticationMethod: "SUPABASE_SESSION" as const }

  const interpretation = await authority.invokeCertification({
    authenticatedInvoker: invoker, subjectKind: "INTERPRETATION", subjectArtifact: interpretationSubject(),
    invocationContext: { sourceProjectId: "fixture-project", sourceWorldId: "living-vrindavan" },
  })
  if (interpretation.outcome !== "ISSUED") throw new Error(`fixture interpretation refused: ${interpretation.detail}`)
  const { episodeCandidate, sourceProposal } = contentEpisodeFor(interpretation.artifact as CertifiedInterpretation)
  const episode = await authority.invokeCertification({
    authenticatedInvoker: invoker, subjectKind: "EPISODE",
    subjectArtifact: { episodeCandidate, compilerIdentity: COMPILER_IDENTITY, sourceProposal, upstreamCertificationRecordId: interpretation.attested.record.certificationRecordId },
    invocationContext: { sourceProjectId: "fixture-project", sourceWorldId: "living-vrindavan" },
  })
  if (episode.outcome !== "ISSUED") throw new Error(`fixture episode refused: ${episode.detail}`)
  const exported = await exportAttestedCertifiedEpisodeContract(registry, trust, episode.attested.record.certificationRecordId)
  if (exported.decision !== "EXPORTED") throw new Error(`fixture export refused: ${exported.detail}`)

  const describe = (result: typeof interpretation & { outcome: "ISSUED" }) => ({
    artifact: result.artifact,
    expectedCanonicalArtifact: canonicalSerialize(result.artifact),
    expectedSubjectDigest: result.attested.record.subjectDigest.value,
    certificationRecord: result.attested,
    expectedSignedBytesBase64: certificationRecordSignedBytes(result.attested.record).toString("base64"),
  })

  return {
    fixtureVersion: "1",
    description: "PLT-ADR-015 cross-repository certification protocol fixture. Produced by @avatark/certification-authority with a TEST-ONLY seed-derived Ed25519 key; verified independently by dt4m-os StudioK. Never trust this key id at runtime.",
    grantIssuedBy: ADMIN_ID,
    canonicalization: {
      scheme: "AVATARK_CANONICAL_JSON_V1",
      sample: { input: { b: [2, 1, { d: null, c: "é" }], a: true }, expectedCanonical: '{"a":true,"b":[2,1,{"c":"é","d":null}]}' },
    },
    signature: {
      algorithm: "Ed25519",
      signedBytesDomainPrefix: "avatark.certification-record.v1\n",
    },
    key: {
      keyId: FIXTURE_KEY_ID,
      authorityId: CERTIFICATION_AUTHORITY_ID,
      algorithm: "Ed25519",
      publicKeySpkiDerBase64: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
    },
    interpretation: describe(interpretation),
    episode: describe(episode),
    attestedEpisodeContractDocument: exported.document,
    expectedVerification: "VALID",
  }
}
