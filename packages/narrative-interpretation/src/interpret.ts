import { deriveCandidateId, deriveInterpretationInputIdentity } from "./identity.ts"
import { buildProvenance } from "./provenance.ts"
import { validateInterpretationInput, validateInterpreterIdentity } from "./validation.ts"
import type { InterpreterIdentity, NarrativeInterpretationCandidate } from "./types.ts"

export function interpretNarrativeEvidence(
  rawInput: unknown,
  rawIdentity: InterpreterIdentity,
): NarrativeInterpretationCandidate {
  const identity = validateInterpreterIdentity(rawIdentity)
  const input = validateInterpretationInput(rawInput)

  const evidenceIds = input.evidence.map((item) => item.evidenceId)
  const interpretationInputIdentity = deriveInterpretationInputIdentity(input)

  return {
    candidateId: deriveCandidateId(interpretationInputIdentity, identity),
    status: "candidate",
    certified: false,
    derivedFromEvidenceIds: evidenceIds,
    provenance: buildProvenance(identity, input.schemaVersion, interpretationInputIdentity, input.evidence),
  }
}
