// Mirrors @avatark/episode-compiler's own validation.ts pattern exactly
// (itself mirroring narrative-interpretation's own precedent): structural
// shape plus self-consistency against the one real, known certification
// authority/policy, reusing narrative-interpretation's own exported
// deriveCertifiedInterpretationId() rather than duplicating or
// hand-mirroring a second certification algorithm. Not cryptographic proof
// of provenance -- see episode-compiler's own validation.ts header comment
// for the same honest limit, which applies identically here.
import { CERTIFICATION_AUTHORITY_IDENTITY, CERTIFICATION_POLICY_IDENTITY, deriveCertifiedInterpretationId } from "@avatark/narrative-interpretation"
import type { CertifiedInterpretation, ContentOriginIdentity, ContentOriginKind } from "./types.ts"

const CONTENT_ORIGIN_KINDS: readonly ContentOriginKind[] = ["human", "rule_engine", "model"]

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isNamedVersionedIdentity(value: unknown): value is { name: string; version: string } {
  if (value === null || typeof value !== "object") {
    return false
  }
  const record = value as Record<string, unknown>
  return isNonEmptyString(record.name) && isNonEmptyString(record.version)
}

function identitiesEqual(a: { name: string; version: string }, b: { name: string; version: string }): boolean {
  return a.name === b.name && a.version === b.version
}

function hasCertifiedInterpretationShape(value: unknown): value is CertifiedInterpretation {
  if (value === null || typeof value !== "object") {
    return false
  }
  const record = value as Record<string, unknown>
  if (!isNonEmptyString(record.certifiedInterpretationId) || !isNonEmptyString(record.candidateId) || !isNonEmptyString(record.interpretationInputIdentity)) {
    return false
  }
  if (!isNamedVersionedIdentity(record.interpreterIdentity)) {
    return false
  }
  if (!Array.isArray(record.evidenceProvenance)) {
    return false
  }
  if (!isNamedVersionedIdentity(record.certificationAuthorityIdentity) || !isNamedVersionedIdentity(record.certificationPolicyIdentity)) {
    return false
  }
  if ("status" in record || "certified" in record) {
    return false
  }
  return true
}

export function isCertifiedInterpretation(value: unknown): value is CertifiedInterpretation {
  if (!hasCertifiedInterpretationShape(value)) {
    return false
  }
  if (!identitiesEqual(value.certificationAuthorityIdentity, CERTIFICATION_AUTHORITY_IDENTITY)) {
    return false
  }
  if (!identitiesEqual(value.certificationPolicyIdentity, CERTIFICATION_POLICY_IDENTITY)) {
    return false
  }
  return value.certifiedInterpretationId === deriveCertifiedInterpretationId(value.candidateId)
}

export function isContentOriginIdentity(value: unknown): value is ContentOriginIdentity {
  if (value === null || typeof value !== "object") {
    return false
  }
  const record = value as Record<string, unknown>
  if (!isNonEmptyString(record.name) || !isNonEmptyString(record.version)) {
    return false
  }
  return typeof record.kind === "string" && (CONTENT_ORIGIN_KINDS as readonly string[]).includes(record.kind)
}

// Extracts every real evidenceId this CertifiedInterpretation's own
// provenance actually carries -- the only ids an EpisodeSegment's evidence
// references may ever name. Never widened beyond this set.
export function knownEvidenceIds(certifiedInterpretation: CertifiedInterpretation): ReadonlySet<string> {
  const ids = new Set<string>()
  for (const entry of certifiedInterpretation.evidenceProvenance) {
    const record = entry as unknown as Record<string, unknown>
    if (isNonEmptyString(record.evidenceId)) {
      ids.add(record.evidenceId)
    }
  }
  return ids
}
