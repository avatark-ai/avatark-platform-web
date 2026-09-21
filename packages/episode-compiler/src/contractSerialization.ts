// PLT-ADR-010 (Cross-Repository Episode Artifact Contract), G10D-6 Track B:
// serializes a real, already-produced CertifiedEpisode into the versioned
// JSON artifact document dt4m-os's own episode-contract module
// independently validates (apps/studio-atlas/src/lib/episode-contract).
// Read-only: never certifies, never mutates its argument, never contacts
// any network/registry/service. The physical transport of the resulting
// document between repositories is explicitly out of this ADR's and this
// function's scope (PLT-ADR-010 section 5).
import type { CertifiedEpisode } from "./types.ts"

// Must match dt4m-os's own SUPPORTED_CONTRACT_VERSIONS
// (apps/studio-atlas/src/lib/episode-contract/types.ts) -- the two
// repositories agree on this value only by both independently following
// PLT-ADR-010's own ratified contract, never by importing a shared
// constant (no cross-repository dependency mechanism exists).
export const CERTIFIED_EPISODE_CONTRACT_VERSION = "1"

export interface CertifiedEpisodeContractDocument {
  readonly contractVersion: typeof CERTIFIED_EPISODE_CONTRACT_VERSION
  readonly certifiedEpisode: CertifiedEpisode
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isCertifiedEpisodeShape(value: unknown): value is CertifiedEpisode {
  if (value === null || typeof value !== "object") return false
  const r = value as Record<string, unknown>
  return (
    isNonEmptyString(r.certifiedEpisodeId) &&
    isNonEmptyString(r.episodeCandidateId) &&
    isNonEmptyString(r.sourceCertifiedInterpretationId) &&
    isNonEmptyString(r.sourceCandidateId) &&
    isNonEmptyString(r.sourceInterpretationInputIdentity) &&
    typeof r.compilerIdentity === "object" &&
    typeof r.certificationAuthorityIdentity === "object" &&
    typeof r.certificationPolicyIdentity === "object"
  )
}

export type ContractSerializationResult =
  | { readonly decision: "SERIALIZED"; readonly document: CertifiedEpisodeContractDocument }
  | { readonly decision: "REJECTED"; readonly detail: string }

// Never throws. Refuses anything that does not already have the real,
// governed CertifiedEpisode shape -- this function is not itself a
// certifier and performs no certification of its own; it only wraps an
// already-certified object in the versioned document envelope.
export function serializeCertifiedEpisodeContract(certifiedEpisode: unknown): ContractSerializationResult {
  if (!isCertifiedEpisodeShape(certifiedEpisode)) {
    return { decision: "REJECTED", detail: "input is not a legitimate CertifiedEpisode -- structurally malformed or missing required certification/provenance fields" }
  }
  return {
    decision: "SERIALIZED",
    document: {
      contractVersion: CERTIFIED_EPISODE_CONTRACT_VERSION,
      certifiedEpisode,
    },
  }
}
