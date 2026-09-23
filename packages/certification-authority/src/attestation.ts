// PLT-ADR-015 §5: asymmetric attestation of Certification Records.
//
// Algorithm: Ed25519 (RFC 8032) via node:crypto -- a mature platform
// primitive, no custom cryptography. Ed25519 signatures are deterministic,
// which lets a cross-repository protocol fixture pin exact signature bytes.
// The algorithm is a constant: it is never negotiated from input.
//
// Signed bytes (CERTIFICATION_RECORD_SIGNED_BYTES_V1):
//   UTF-8("avatark.certification-record.v1\n") || canonicalBytes(record)
// where `record` is the COMPLETE CertificationRecord. The attestation
// object (algorithm, keyId, signature) is the only content outside the
// signed bytes; its keyId must equal record.certificationAuthority.keyId,
// which IS signed. The domain-separation prefix prevents a signature over
// any other canonical JSON document being replayed as a record signature.
//
// Key custody: the private key only ever exists inside the closure returned
// by createEd25519Signer, held by the Certification Authority boundary. A
// verifier holds only public keys (TrustedCertificationKey) and nothing in
// this module can derive a signer from one.
import { createHash, createPublicKey, KeyObject, sign as cryptoSign, verify as cryptoVerify } from "node:crypto"
import { canonicalBytes } from "./canonicalJson.ts"
import type {
  AttestedCertificationRecord,
  CertificationAttestation,
  CertificationRecord,
  CertificationEvidenceFailure,
  SubjectDigest,
} from "./types.ts"

export const CERTIFICATION_SIGNATURE_ALGORITHM = "Ed25519" as const
export const CERTIFICATION_RECORD_SIGNATURE_DOMAIN = "avatark.certification-record.v1\n"

export function computeSubjectDigest(artifact: unknown): SubjectDigest {
  return {
    algorithm: "SHA-256",
    canonicalization: "AVATARK_CANONICAL_JSON_V1",
    value: createHash("sha256").update(canonicalBytes(artifact)).digest("hex"),
  }
}

export function certificationRecordSignedBytes(record: CertificationRecord): Buffer {
  return Buffer.concat([Buffer.from(CERTIFICATION_RECORD_SIGNATURE_DOMAIN, "utf8"), canonicalBytes(record)])
}

export interface CertificationSigner {
  readonly authorityId: string
  readonly keyId: string
  readonly publicKey: KeyObject
  sign(record: CertificationRecord): CertificationAttestation
}

function assertEd25519(key: KeyObject, type: "private" | "public"): void {
  if (key.type !== type || key.asymmetricKeyType !== "ed25519") {
    throw new Error(`certification key must be an Ed25519 ${type} key`)
  }
}

/**
 * The only way to produce an attestation. The private key is captured in
 * this closure and never exposed as a property, so it cannot be serialized
 * or logged through the signer object.
 */
export function createEd25519Signer(input: { authorityId: string; keyId: string; privateKey: KeyObject }): CertificationSigner {
  assertEd25519(input.privateKey, "private")
  if (!input.keyId || !input.authorityId) throw new Error("certification signer requires authorityId and keyId")
  const privateKey = input.privateKey
  const publicKey = createPublicKey(privateKey)
  const signer: CertificationSigner = {
    authorityId: input.authorityId,
    keyId: input.keyId,
    publicKey,
    sign(record: CertificationRecord): CertificationAttestation {
      if (record.certificationAuthority.keyId !== input.keyId || record.certificationAuthority.authorityId !== input.authorityId) {
        throw new Error("record names a different authority/key than this signer")
      }
      const signature = cryptoSign(null, certificationRecordSignedBytes(record), privateKey).toString("base64url")
      return { algorithm: CERTIFICATION_SIGNATURE_ALGORITHM, keyId: input.keyId, signature }
    },
  }
  Object.defineProperty(signer, "toJSON", { value: () => ({ authorityId: input.authorityId, keyId: input.keyId }), enumerable: false })
  return Object.freeze(signer)
}

/** A verifier-side trust entry: public material only. */
export interface TrustedCertificationKey {
  keyId: string
  authorityId: string
  algorithm: "Ed25519"
  publicKey: KeyObject
}

/** §5 key-id trust: an explicit allowlist, plus an explicit distrust list for compromised key ids. */
export interface CertificationKeyTrust {
  trustedKeys: readonly TrustedCertificationKey[]
  distrustedKeyIds: readonly string[]
}

export function createKeyTrust(trustedKeys: readonly TrustedCertificationKey[], distrustedKeyIds: readonly string[] = []): CertificationKeyTrust {
  for (const key of trustedKeys) assertEd25519(key.publicKey, "public")
  return { trustedKeys: [...trustedKeys], distrustedKeyIds: [...distrustedKeyIds] }
}

export type AttestationVerification =
  | { ok: true; key: TrustedCertificationKey }
  | { ok: false; failure: CertificationEvidenceFailure; detail: string }

/**
 * Verifies the signature and key trust only. Recognized authority/policy,
 * state and subject binding are the caller's further checks.
 */
export function verifyRecordAttestation(attested: AttestedCertificationRecord, trust: CertificationKeyTrust): AttestationVerification {
  const { record, attestation } = attested
  if (attestation.algorithm !== CERTIFICATION_SIGNATURE_ALGORITHM) {
    return { ok: false, failure: "FORGED_OR_INVALID_ATTESTATION", detail: `unsupported attestation algorithm "${String(attestation.algorithm)}"` }
  }
  if (attestation.keyId !== record.certificationAuthority.keyId) {
    return { ok: false, failure: "FORGED_OR_INVALID_ATTESTATION", detail: "attestation keyId does not match the signed record keyId" }
  }
  if (trust.distrustedKeyIds.includes(attestation.keyId)) {
    return { ok: false, failure: "FORGED_OR_INVALID_ATTESTATION", detail: `key id "${attestation.keyId}" is distrusted` }
  }
  const key = trust.trustedKeys.find((k) => k.keyId === attestation.keyId)
  if (!key) {
    return { ok: false, failure: "FORGED_OR_INVALID_ATTESTATION", detail: `key id "${attestation.keyId}" is not trusted` }
  }
  let signature: Buffer
  try {
    signature = Buffer.from(attestation.signature, "base64url")
  } catch {
    return { ok: false, failure: "FORGED_OR_INVALID_ATTESTATION", detail: "signature is not base64url" }
  }
  if (signature.length !== 64) {
    return { ok: false, failure: "FORGED_OR_INVALID_ATTESTATION", detail: "Ed25519 signature must be 64 bytes" }
  }
  let valid = false
  try {
    valid = cryptoVerify(null, certificationRecordSignedBytes(record), key.publicKey, signature)
  } catch {
    valid = false
  }
  if (!valid) return { ok: false, failure: "FORGED_OR_INVALID_ATTESTATION", detail: "signature does not verify" }
  if (key.authorityId !== record.certificationAuthority.authorityId) {
    return { ok: false, failure: "UNRECOGNIZED_CERTIFICATION_AUTHORITY", detail: `key "${key.keyId}" is not trusted for authority "${record.certificationAuthority.authorityId}"` }
  }
  return { ok: true, key }
}
