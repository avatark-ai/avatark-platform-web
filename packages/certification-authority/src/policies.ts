// PLT-ADR-015 §2, §4, §10: the recognized (Founders-ratified) policies, the
// per-subject-kind invocation capabilities, and the permitted record states.
// The policy/evaluator identities are imported from the owning packages --
// never re-declared -- so the evaluators remain the only definition of each
// policy (§1).
import { CERTIFICATION_AUTHORITY_IDENTITY, CERTIFICATION_POLICY_IDENTITY } from "@avatark/narrative-interpretation"
import { EPISODE_CERTIFICATION_AUTHORITY_IDENTITY, EPISODE_CERTIFICATION_POLICY_IDENTITY } from "@avatark/episode-compiler"
import type { CertificationSubjectKind, NamedVersionedIdentity } from "./types.ts"

/** The issuing Certification Authority's identity (§3). Distinct from every evaluator identity. */
export const CERTIFICATION_AUTHORITY_ID = "avatark-narrative-certification-authority"

export const CERTIFICATION_RECORD_FORMAT_VERSION = "1" as const

/** §9: first slice issues and accepts only "issued". Every other state fails closed. */
export const PERMITTED_CERTIFICATION_STATES: readonly string[] = ["issued"]

export interface RecognizedCertificationPolicy {
  subjectKind: CertificationSubjectKind
  policy: NamedVersionedIdentity
  evaluator: NamedVersionedIdentity
}

/** §10: append-only set of policies recognized as issuable. */
export const RECOGNIZED_CERTIFICATION_POLICIES: readonly RecognizedCertificationPolicy[] = [
  { subjectKind: "INTERPRETATION", policy: CERTIFICATION_POLICY_IDENTITY, evaluator: CERTIFICATION_AUTHORITY_IDENTITY },
  { subjectKind: "EPISODE", policy: EPISODE_CERTIFICATION_POLICY_IDENTITY, evaluator: EPISODE_CERTIFICATION_AUTHORITY_IDENTITY },
]

/**
 * §2: per-subject-kind certification-invocation grant, held in the existing
 * administrator-issued `capability_grants` table (migration 020). Distinct
 * from every publish/admin/editor permission -- nothing else in this
 * ecosystem reads these keys.
 */
export const CERTIFICATION_INVOCATION_CAPABILITIES: Readonly<Record<CertificationSubjectKind, string>> = {
  INTERPRETATION: "certification.invoke.interpretation",
  EPISODE: "certification.invoke.episode",
}

export function isCertificationSubjectKind(value: unknown): value is CertificationSubjectKind {
  return value === "INTERPRETATION" || value === "EPISODE"
}

function sameIdentity(a: NamedVersionedIdentity, b: NamedVersionedIdentity): boolean {
  return a.name === b.name && a.version === b.version
}

export function findRecognizedPolicy(
  subjectKind: CertificationSubjectKind,
  policy: NamedVersionedIdentity,
  evaluator: NamedVersionedIdentity,
): RecognizedCertificationPolicy | undefined {
  return RECOGNIZED_CERTIFICATION_POLICIES.find(
    (p) => p.subjectKind === subjectKind && sameIdentity(p.policy, policy) && sameIdentity(p.evaluator, evaluator),
  )
}

export function policyForSubjectKind(subjectKind: CertificationSubjectKind): RecognizedCertificationPolicy {
  const found = RECOGNIZED_CERTIFICATION_POLICIES.find((p) => p.subjectKind === subjectKind)
  if (!found) throw new Error(`no recognized policy for ${subjectKind}`)
  return found
}
