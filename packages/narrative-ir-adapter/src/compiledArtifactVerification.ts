// PLT-VERIFY-09: the platform trust boundary for compiled Living World
// artifacts. A claimed CompiledArtifactIdentity {fixtureId, digest} is
// accepted only when the canonical bytes the compiler emitted for it are
// presented alongside it and hash to exactly that digest.
//
// Authority split (PLT-ADR-009/010 as amended by PLT-GOV-07):
// - The compiler (avatark-ai/studiok-living-world-compiler) owns
//   canonicalization and the digest definition. Its published output
//   contract (scripts/compile-living-world-artifact.mjs, compile() and CLI)
//   is: canonical bytes = the compact JSON payload
//   {"canonicalizationVersion", "artifact"}, and digest = SHA-256 over
//   exactly those UTF-8 bytes, nothing more.
// - This package owns only acceptance or refusal at the platform boundary.
//   It never serializes, re-canonicalizes, or repairs anything: it hashes
//   the bytes it was given and compares. The verification material is
//   therefore the compiler's own canonical bytes (compile().canonicalBytes,
//   the CLI's stdout, or a compiler golden `*.canonical.json`), never a
//   parsed document re-serialized here.
//
// What VERIFIED proves: these bytes are exactly the bytes whose digest was
// claimed, under a canonicalization version this package knows the digest
// rule for. It does not prove who issued the claimed digest; that remains a
// provenance question for the caller.
//
// Pure: no network, filesystem, database, clock, randomness, or shared
// mutable state. Every expected failure is a REFUSED result, never a throw.
import { createHash } from "node:crypto"
import type { CompiledArtifactIdentity } from "./canonicalNarrativeIR.ts"

// Canonicalization versions whose digest rule this boundary knows. Only the
// compiler defines a version's rule; a version absent from this list is
// refused, never guessed at or assumed compatible with 0.1.0.
export const SUPPORTED_CANONICALIZATION_VERSIONS: readonly string[] = ["0.1.0"]

export interface CompiledArtifactVerificationInput {
  // The claimed identity, as produced by the compiler's compile() result.
  readonly artifact: CompiledArtifactIdentity
  // The compiler-emitted canonical bytes for that artifact, as a string of
  // exactly those UTF-8 bytes (no added or removed whitespace or newline).
  readonly canonicalBytes: string
}

export type CompiledArtifactRefusalReason =
  | "MALFORMED_ARTIFACT_REFERENCE"
  | "MISSING_VERIFICATION_MATERIAL"
  | "MALFORMED_CANONICAL_MATERIAL"
  | "UNSUPPORTED_CANONICALIZATION_VERSION"
  | "DIGEST_MISMATCH"
  | "SOURCE_IDENTITY_MISMATCH"

export type CompiledArtifactVerificationResult =
  | {
      readonly decision: "VERIFIED"
      readonly artifact: CompiledArtifactIdentity
      readonly canonicalizationVersion: string
      // The artifact parsed from the verified bytes, for callers that select
      // evidence from it. Never re-serialized by this package.
      readonly canonicalArtifact: Readonly<Record<string, unknown>>
    }
  | { readonly decision: "REFUSED"; readonly reason: CompiledArtifactRefusalReason; readonly detail: string }

function refuse(reason: CompiledArtifactRefusalReason, detail: string): CompiledArtifactVerificationResult {
  return { decision: "REFUSED", reason, detail }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

const SHA256_HEX = /^[0-9a-f]{64}$/

// Refusal precedence is fixed, so the same input always yields the same
// reason: reference shape, then material presence, then material shape, then
// canonicalization version (the digest rule depends on it), then digest, then
// identity.
export function verifyCompiledArtifact(input: unknown): CompiledArtifactVerificationResult {
  const record = isRecord(input) ? input : undefined
  const artifact = record && isRecord(record.artifact) ? record.artifact : undefined
  if (!artifact || typeof artifact.fixtureId !== "string" || artifact.fixtureId.length === 0) {
    return refuse("MALFORMED_ARTIFACT_REFERENCE", "artifact.fixtureId must be a non-empty string")
  }
  if (typeof artifact.digest !== "string" || !SHA256_HEX.test(artifact.digest)) {
    return refuse("MALFORMED_ARTIFACT_REFERENCE", "artifact.digest must be a lowercase 64-hex-character SHA-256 value")
  }
  const claimed: CompiledArtifactIdentity = { fixtureId: artifact.fixtureId, digest: artifact.digest }

  const bytes = record?.canonicalBytes
  if (typeof bytes !== "string" || bytes.length === 0) {
    return refuse("MISSING_VERIFICATION_MATERIAL", "canonicalBytes (the compiler-emitted canonical bytes) must be supplied")
  }

  let payload: unknown
  try {
    payload = JSON.parse(bytes)
  } catch {
    return refuse("MALFORMED_CANONICAL_MATERIAL", "canonicalBytes is not valid JSON")
  }
  if (!isRecord(payload) || typeof payload.canonicalizationVersion !== "string" || !isRecord(payload.artifact)) {
    return refuse("MALFORMED_CANONICAL_MATERIAL", "canonicalBytes is not a {canonicalizationVersion, artifact} compiler payload")
  }

  const version = payload.canonicalizationVersion
  if (!SUPPORTED_CANONICALIZATION_VERSIONS.includes(version)) {
    return refuse(
      "UNSUPPORTED_CANONICALIZATION_VERSION",
      `canonicalizationVersion "${version}" is not supported. Supported: ${SUPPORTED_CANONICALIZATION_VERSIONS.join(", ")}`,
    )
  }

  // Canonicalization 0.1.0 digest rule, as published by the compiler:
  // SHA-256 over exactly the canonical bytes, UTF-8 encoded.
  const actual = createHash("sha256").update(bytes, "utf8").digest("hex")
  if (actual !== claimed.digest) {
    return refuse("DIGEST_MISMATCH", `SHA-256 of canonicalBytes is ${actual}, but the claimed digest is ${claimed.digest}`)
  }

  if (payload.artifact.fixtureId !== claimed.fixtureId) {
    return refuse(
      "SOURCE_IDENTITY_MISMATCH",
      `canonical artifact fixtureId ${JSON.stringify(payload.artifact.fixtureId)} does not equal the claimed fixtureId ${JSON.stringify(claimed.fixtureId)}`,
    )
  }

  return { decision: "VERIFIED", artifact: claimed, canonicalizationVersion: version, canonicalArtifact: payload.artifact }
}
