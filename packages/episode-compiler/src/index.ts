export type {
  CertifiedInterpretation,
  ContentOriginIdentity,
  EpisodeContent,
  EpisodeContentProposal,
  EpisodeCompilerIdentity,
  EpisodeCompilationFoundation,
  EpisodeCompilationRefusalReason,
  EpisodeCompilationResult,
  EpisodeCandidate,
  EpisodeCandidateRefusalReason,
  EpisodeCandidateResult,
  CertifiedEpisode,
  EpisodeCertificationRefusalReason,
  EpisodeCertificationResult,
  RuntimeProjectability,
} from "./types.ts"

export { isCertifiedInterpretation } from "./validation.ts"

export { isEpisodeContentProposal } from "./proposalValidation.ts"

export { compileEpisodeFoundation } from "./compile.ts"

export { EPISODE_CANDIDATE_CONTRACT_IDENTITY, compileEpisodeCandidate } from "./episodeCandidate.ts"

export { compileEpisodeCandidateWithProposal } from "./episodeCandidateContent.ts"

export { EPISODE_CERTIFICATION_AUTHORITY_IDENTITY, EPISODE_CERTIFICATION_POLICY_IDENTITY, certifyEpisodeCandidate } from "./episodeCertify.ts"

export { certifyEpisodeCandidateWithProposal } from "./episodeCertifyContent.ts"

export { runtimeProjectabilityOf } from "./runtimeProjectability.ts"

export { CERTIFIED_EPISODE_CONTRACT_VERSION, serializeCertifiedEpisodeContract } from "./contractSerialization.ts"
export type { CertifiedEpisodeContractDocument, ContractSerializationResult } from "./contractSerialization.ts"
