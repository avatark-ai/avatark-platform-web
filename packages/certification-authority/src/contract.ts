// PLT-ADR-015 §7: the attested PLT-ADR-010 contract version. Contract "1"
// (episode-compiler's serializeCertifiedEpisodeContract) is unchanged and
// remains structural/display-only. Contract "2" carries the certified
// artifact TOGETHER WITH its signed Certification Record and the upstream
// Interpretation artifact + record, so any verifier can check the whole
// chain offline, with no live lookup (PLT-ADR-010 B3).
//
// The document is exported from this Authority's own registry only: both
// records are re-verified before export, so the exporter never repackages
// unverified caller data.
import type { CertificationKeyTrust } from "./attestation.ts"
import type { CertificationRegistry } from "./ports.ts"
import type { AttestedCertificationRecord, CertificationEvidenceFailure } from "./types.ts"
import { verifyAttestedEvidence } from "./verify.ts"

export const ATTESTED_CERTIFIED_EPISODE_CONTRACT_VERSION = "2" as const

export interface AttestedCertifiedEpisodeContractDocument {
  contractVersion: typeof ATTESTED_CERTIFIED_EPISODE_CONTRACT_VERSION
  certifiedEpisode: unknown
  certificationRecord: AttestedCertificationRecord
  upstreamInterpretation: {
    certifiedInterpretation: unknown
    certificationRecord: AttestedCertificationRecord
  }
}

export type AttestedContractExportResult =
  | { decision: "EXPORTED"; document: AttestedCertifiedEpisodeContractDocument }
  | { decision: "REFUSED"; failure: CertificationEvidenceFailure; detail: string }

export async function exportAttestedCertifiedEpisodeContract(
  registry: CertificationRegistry,
  trust: CertificationKeyTrust,
  episodeCertificationRecordId: string,
): Promise<AttestedContractExportResult> {
  const episode = await registry.getByRecordId(episodeCertificationRecordId)
  if (!episode) return { decision: "REFUSED", failure: "UNKNOWN_CERTIFICATION_REFERENCE", detail: `no record ${episodeCertificationRecordId}` }
  const episodeCheck = verifyAttestedEvidence(episode.attested, episode.artifact, "EPISODE", trust)
  if (!episodeCheck.ok) return { decision: "REFUSED", failure: episodeCheck.failure, detail: episodeCheck.detail }

  const upstreamBinding = episodeCheck.attested.record.upstreamCertification
  if (!upstreamBinding) return { decision: "REFUSED", failure: "PROVENANCE_MISMATCH", detail: "episode record has no upstream binding" }
  const upstream = await registry.getByRecordId(upstreamBinding.certificationRecordId)
  if (!upstream) return { decision: "REFUSED", failure: "PROVENANCE_MISMATCH", detail: "upstream record is not in the registry" }
  const upstreamCheck = verifyAttestedEvidence(upstream.attested, upstream.artifact, "INTERPRETATION", trust)
  if (!upstreamCheck.ok) return { decision: "REFUSED", failure: "PROVENANCE_MISMATCH", detail: `${upstreamCheck.failure}: ${upstreamCheck.detail}` }
  if (
    upstreamCheck.attested.record.subjectId !== upstreamBinding.subjectId ||
    upstreamCheck.attested.record.subjectDigest.value !== upstreamBinding.subjectDigest.value
  ) {
    return { decision: "REFUSED", failure: "PROVENANCE_MISMATCH", detail: "upstream record does not match the episode record's binding" }
  }

  return {
    decision: "EXPORTED",
    document: {
      contractVersion: ATTESTED_CERTIFIED_EPISODE_CONTRACT_VERSION,
      certifiedEpisode: episode.artifact,
      certificationRecord: episodeCheck.attested,
      upstreamInterpretation: { certifiedInterpretation: upstream.artifact, certificationRecord: upstreamCheck.attested },
    },
  }
}
