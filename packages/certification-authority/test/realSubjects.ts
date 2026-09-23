// Test support: real subjects produced by the real, unmodified derivation
// functions (the same construction the evaluator packages' own tests use).
import { evidenceItemFromExpectedAbsenceFact, interpretNarrativeEvidence } from "@avatark/narrative-interpretation"
import type { InterpreterIdentity, NarrativeInterpretationInput } from "@avatark/narrative-interpretation"
import { compileEpisodeCandidate, compileEpisodeCandidateWithProposal } from "@avatark/episode-compiler"
import type { CertifiedInterpretation, EpisodeCompilerIdentity } from "@avatark/episode-compiler"
import { proposeEpisodeContent } from "@avatark/episode-semantic-generation"
import type { ContentOriginIdentity } from "@avatark/episode-semantic-generation"

export const INTERPRETER_IDENTITY: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }
export const COMPILER_IDENTITY: EpisodeCompilerIdentity = { name: "episode-compiler", version: "0.1.0" }
const HUMAN_ORIGIN: ContentOriginIdentity = { kind: "human", name: "writer-domain-boundary", version: "1" }

export function realLookingFact(subject = "place/waiting-hollow") {
  return {
    expectationId: `expectation-${subject}`,
    subjectId: subject,
    property: "occupancy",
    origin: "WORLD_PATTERN" as const,
    irVersion: "0.3.0",
    evidenceStateIds: [0, 1, 2, 3].map((i) => `expectation-${subject}-evidence-${i}`),
    logicalTick: 10,
    disconfirmationCount: 1,
    artifactReference: {
      sourceId: "C-repeated-pattern-gap-perceptible-absence",
      digest: "7a823c5abc98bc21c53f4be3ea7444625ca89b7baa679731ab514ba77d84efba",
      ruleId: "runtime-requirements/occupancy-pattern",
      eventId: subject,
    },
  }
}

export function realInput(subject?: string): NarrativeInterpretationInput {
  return { schemaVersion: "1", evidence: [evidenceItemFromExpectedAbsenceFact(realLookingFact(subject))] }
}

/** The raw INTERPRETATION subject a certifier submits: candidate + the exact inputs it claims to derive from. */
export function interpretationSubject(subject?: string) {
  const sourceInput = realInput(subject)
  const candidate = interpretNarrativeEvidence(sourceInput, INTERPRETER_IDENTITY)
  return { candidate, sourceInput, sourceIdentity: INTERPRETER_IDENTITY }
}

export function episodeCandidateFor(certifiedInterpretation: CertifiedInterpretation) {
  const compiled = compileEpisodeCandidate(certifiedInterpretation, COMPILER_IDENTITY)
  if (compiled.decision !== "COMPILED") throw new Error(`compile failed: ${compiled.detail}`)
  return compiled.episodeCandidate
}

export function contentEpisodeFor(certifiedInterpretation: CertifiedInterpretation) {
  const evidenceId = certifiedInterpretation.evidenceProvenance[0]?.evidenceId ?? "expectation-place/waiting-hollow"
  const proposed = proposeEpisodeContent(
    certifiedInterpretation,
    {
      title: "The Flute Across Yamuna",
      premise: "A quiet, repeated absence at the waiting hollow becomes noticeable.",
      segments: [{ label: "Arrival", statement: "The visitor approaches the waiting hollow and finds it unusually still.", evidenceReferences: [evidenceId] }],
    },
    HUMAN_ORIGIN,
  )
  if (proposed.decision !== "PROPOSED") throw new Error(`propose failed: ${proposed.detail}`)
  const compiled = compileEpisodeCandidateWithProposal(certifiedInterpretation, COMPILER_IDENTITY, proposed.proposal)
  if (compiled.decision !== "COMPILED") throw new Error(`compile failed: ${compiled.detail}`)
  return { episodeCandidate: compiled.episodeCandidate, sourceProposal: proposed.proposal }
}
