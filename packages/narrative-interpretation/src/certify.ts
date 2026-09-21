// STK-WO-009 Phase D (G10C-4): the certification boundary --
// NarrativeInterpretationCandidate -> certification evaluation -> CERTIFIED
// (CertifiedInterpretation) | REFUSED.
//
// DELIBERATELY SEPARATE from interpret.ts: nothing in interpret.ts or
// worldEvidence.ts imports this file, and this file is never invoked by
// interpretNarrativeEvidence() -- the invariant interpret(...) != certify(...)
// is structural, not just a convention, and is proven by a static test.
// This file DOES import interpret.ts (the one direction the invariant
// permits) -- not to let the interpreter certify itself, but so
// certification can independently recompute a fresh candidate from the
// exact same deterministic derivation logic and compare it against the one
// presented for certification, rather than trusting the presented
// candidate's own claimed fields or inventing a second, divergent identity
// algorithm.
//
// Certification here is exclusively structural, provenance, and identity
// validation -- never narrative quality, emotional impact, engagement, or
// any model/LLM score. It does not decide WHO is authorized to invoke this
// function in a real governed review process (StudioK's own "Certify" World
// left-nav step, per PLT-ADR-009 decision 5) -- that human/process
// authority question is explicitly named in STK-WO-009's own "Human /
// Founders decision points" as still open. What this function decides is
// narrower and fully answerable from evidence today: given a candidate and
// the exact raw input/identity it claims to derive from, is that candidate's
// structure, identity, and provenance sound enough for a governed process to
// legitimately certify it.
import { createHash } from "node:crypto"
import { interpretNarrativeEvidence } from "./interpret.ts"
import type {
  CertificationRefusalReason,
  CertificationResult,
  CertifiedInterpretation,
  EvidenceProvenanceEntry,
  InterpreterIdentity,
  NamedVersionedIdentity,
} from "./types.ts"

// This package's own certifying-authority identity -- distinct from
// InterpreterIdentity (which names the *derivation* actor). Not the
// production governance/process authority question (see file header);
// only the identity of this structural policy implementation.
export const CERTIFICATION_AUTHORITY_IDENTITY: NamedVersionedIdentity = {
  name: "narrative-interpretation-certification",
  version: "0.1.0",
}

export const CERTIFICATION_POLICY_IDENTITY: NamedVersionedIdentity = {
  name: "structural-provenance-identity-policy",
  version: "1",
}

// Matches schemas/ir/v0/*.schema.json's own `irVersion` enum exactly
// (every one of the real Lane-1 IR schemas declares this identical set) --
// reused, never invented, and never narrowed to "the current fixture's
// version" as if that were eternal truth.
export const SUPPORTED_SOURCE_IR_VERSIONS: readonly string[] = ["0.1.0", "0.2.0", "0.3.0"]

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

// FORMAT validation only. This function is never the digest's certifying
// authority -- that is Lane-1's compiler (see the SOURCE_DIGEST vs
// CERTIFIER_VERIFICATION distinction in this gate's completion report). It
// never recomputes a digest from canonical bytes and never repairs a
// malformed one into a valid shape.
function isWellFormedSha256Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value)
}

// Deterministic: a function of stable semantic identity only (candidateId +
// the certifying authority + the policy applied) -- never a wall-clock
// timestamp or random id, so it must never contaminate or be contaminated
// by anything time-dependent.
//
// STK-WO-009 Phase E (G10D-1): exported (not merely internal) so a
// downstream Episode-Compiler-authority consumer can verify a presented
// CertifiedInterpretation's own certifiedInterpretationId is self-consistent
// with its candidateId, without copying certification's own evidence
// policy. This is a narrow factoring, not a duplicated algorithm -- see
// that consuming package's own validation module for the honest limits of
// what this proves.
export function deriveCertifiedInterpretationId(candidateId: string): string {
  const basis = JSON.stringify({
    candidateId,
    certificationAuthorityIdentity: CERTIFICATION_AUTHORITY_IDENTITY,
    certificationPolicyIdentity: CERTIFICATION_POLICY_IDENTITY,
  })
  return createHash("sha256").update(basis).digest("hex")
}

function refuse(reason: CertificationRefusalReason, detail: string): CertificationResult {
  return { decision: "REFUSED", reason, detail }
}

function evaluateEvidencePolicy(evidenceProvenance: readonly EvidenceProvenanceEntry[]): CertificationResult | undefined {
  let hasAdaptedRealEvidence = false
  for (const entry of evidenceProvenance) {
    if (entry.integration !== "ADAPTED_REAL") {
      continue
    }
    hasAdaptedRealEvidence = true

    // I: source irVersion present for ADAPTED_REAL evidence.
    if (!isNonEmptyString(entry.sourceIrVersion)) {
      return refuse("MISSING_REQUIRED_EVIDENCE", `ADAPTED_REAL evidence "${entry.evidenceId}" is missing sourceIrVersion`)
    }
    // Version policy (section 8): a supported-version set sourced from
    // Lane-1's own schemas, never a hard-coded "current" version.
    if (!SUPPORTED_SOURCE_IR_VERSIONS.includes(entry.sourceIrVersion)) {
      return refuse(
        "UNSUPPORTED_SOURCE_VERSION",
        `ADAPTED_REAL evidence "${entry.evidenceId}" declares unsupported source irVersion "${entry.sourceIrVersion}". Supported: ${SUPPORTED_SOURCE_IR_VERSIONS.join(", ")}.`,
      )
    }

    // J: source artifact identity present.
    if (!entry.sourceArtifact) {
      return refuse("MISSING_REQUIRED_EVIDENCE", `ADAPTED_REAL evidence "${entry.evidenceId}" is missing sourceArtifact`)
    }
    if (!isNonEmptyString(entry.sourceArtifact.digest)) {
      return refuse("MISSING_REQUIRED_EVIDENCE", `ADAPTED_REAL evidence "${entry.evidenceId}" is missing a source digest`)
    }
    // K: canonical source digest format validation -- format only, never
    // recomputed, never treated as this package's own authority.
    if (!isWellFormedSha256Hex(entry.sourceArtifact.digest)) {
      return refuse(
        "INVALID_SOURCE_DIGEST",
        `ADAPTED_REAL evidence "${entry.evidenceId}" carries a source digest that is not a well-formed 64-hex-character SHA-256 value. This check validates format only -- it never recomputes or replaces the source's own digest.`,
      )
    }
  }

  // H/O: at least one ADAPTED_REAL evidence item is required -- an
  // interpretation built only from not-yet-integrated evidence has nothing
  // governed to certify.
  if (!hasAdaptedRealEvidence) {
    return refuse("MISSING_REQUIRED_EVIDENCE", "candidate carries no ADAPTED_REAL evidence -- nothing governed to certify")
  }

  return undefined
}

// certifyInterpretationCandidate never throws -- even a fully malformed
// candidate/input/identity produces a REFUSED result, never an exception,
// so a governed caller never needs a try/catch to get a decision.
//
// sourceInput/sourceIdentity are the exact raw evidence and interpreter
// identity `candidate` claims to have been derived from. Certification does
// not trust `candidate`'s own claimed fields -- it independently rebuilds a
// fresh candidate from these two raw arguments (via the same
// interpretNarrativeEvidence() the original derivation used) and compares.
export function certifyInterpretationCandidate(candidate: unknown, sourceInput: unknown, sourceIdentity: unknown): CertificationResult {
  // A/B/C: structural candidate validity; status is exactly "candidate";
  // not already certified. Checked before any recomputation, since a
  // structurally malformed candidate cannot be meaningfully compared.
  if (candidate === null || typeof candidate !== "object") {
    return refuse("INVALID_CANDIDATE", "candidate must be an object")
  }
  const c = candidate as Record<string, unknown>
  if (c.status !== "candidate") {
    return refuse("INVALID_CANDIDATE", `candidate.status must be "candidate", got ${JSON.stringify(c.status)}`)
  }
  if (c.certified !== false) {
    return refuse("ALREADY_CERTIFIED", "candidate.certified must be exactly false -- a candidate that does not carry this literal cannot be certified by this function")
  }
  if (!isNonEmptyString(c.candidateId) || !Array.isArray(c.derivedFromEvidenceIds)) {
    return refuse("INVALID_CANDIDATE", "candidate.candidateId (non-empty string) and candidate.derivedFromEvidenceIds (array) are required")
  }
  const p = c.provenance as Record<string, unknown> | null | undefined
  if (!p || typeof p !== "object" || !isNonEmptyString(p.interpretationInputIdentity) || !Array.isArray(p.evidenceProvenance) || !Array.isArray(p.sourceEvidenceIds)) {
    return refuse("INVALID_CANDIDATE", "candidate.provenance is required and must carry interpretationInputIdentity/evidenceProvenance/sourceEvidenceIds")
  }

  // D/E/L/M: independently recompute a fresh candidate from the exact raw
  // source using the same deterministic derivation path -- never a second,
  // divergent identity algorithm.
  let recomputed
  try {
    recomputed = interpretNarrativeEvidence(sourceInput, sourceIdentity as InterpreterIdentity)
  } catch {
    return refuse("INVALID_CANDIDATE", "the supplied source evidence/interpreter identity do not themselves validate as a legitimate interpretation input -- certification has nothing legitimate to recompute against")
  }

  if (recomputed.provenance.interpretationInputIdentity !== p.interpretationInputIdentity) {
    return refuse(
      "INVALID_INPUT_IDENTITY",
      "recomputing interpretationInputIdentity from the supplied source evidence does not match the candidate's own provenance.interpretationInputIdentity -- the evidence content or this identity field was changed after derivation",
    )
  }
  if (recomputed.candidateId !== c.candidateId) {
    return refuse(
      "INVALID_CANDIDATE_IDENTITY",
      "recomputing candidateId from the supplied source evidence and interpreter identity does not match the candidate's own candidateId -- the interpreter identity or this identity field was changed after derivation",
    )
  }

  // P: provenance internally consistent -- everything else the candidate
  // claims must match what a fresh, legitimate derivation of the identical
  // source would produce. This is the single check that also proves N/O
  // (no fabricated/mismatched evidence) and closes the synthetic-reference
  // gap in section 6: evidenceProvenance is compared by value against a
  // freshly rebuilt one, never trusted as presented, and evidenceStateIds
  // is never read anywhere in this file -- it cannot influence this
  // comparison in either direction.
  const derivedFromEvidenceIdsMatch = JSON.stringify(c.derivedFromEvidenceIds) === JSON.stringify(recomputed.derivedFromEvidenceIds)
  const sourceEvidenceIdsMatch = JSON.stringify(p.sourceEvidenceIds) === JSON.stringify(recomputed.provenance.sourceEvidenceIds)
  const evidenceProvenanceMatch = JSON.stringify(p.evidenceProvenance) === JSON.stringify(recomputed.provenance.evidenceProvenance)
  if (!derivedFromEvidenceIdsMatch || !sourceEvidenceIdsMatch || !evidenceProvenanceMatch) {
    return refuse(
      "INVALID_PROVENANCE",
      "candidate.derivedFromEvidenceIds / provenance.sourceEvidenceIds / provenance.evidenceProvenance do not match what a fresh derivation of the supplied source evidence produces",
    )
  }

  // F/G/H/I/J/K/N/O: evidence policy, evaluated against the now-proven-authentic
  // (matches a fresh recomputation) evidenceProvenance.
  const policyRefusal = evaluateEvidencePolicy(recomputed.provenance.evidenceProvenance)
  if (policyRefusal) {
    return policyRefusal
  }

  const certifiedInterpretation: CertifiedInterpretation = {
    certifiedInterpretationId: deriveCertifiedInterpretationId(recomputed.candidateId),
    candidateId: recomputed.candidateId,
    interpretationInputIdentity: recomputed.provenance.interpretationInputIdentity,
    interpreterIdentity: recomputed.provenance.interpreterIdentity,
    evidenceProvenance: recomputed.provenance.evidenceProvenance,
    certificationAuthorityIdentity: CERTIFICATION_AUTHORITY_IDENTITY,
    certificationPolicyIdentity: CERTIFICATION_POLICY_IDENTITY,
  }
  return { decision: "CERTIFIED", certifiedInterpretation }
}
