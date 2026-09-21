export type {
  InterpreterName,
  InterpreterIdentity,
  NarrativeEvidenceItem,
  NarrativeInterpretationInput,
  EvidenceIntegrationStatus,
  EvidenceProvenanceEntry,
  EvidenceRequirementClassification,
  InterpretationProvenance,
  NarrativeInterpretationCandidate,
} from "./types.ts"

export {
  NarrativeInterpretationError,
  MalformedInterpretationInputError,
  MissingInterpreterIdentityError,
  UnsupportedInputSchemaVersionError,
  CertificationAttemptRejectedError,
  UnsupportedEvidenceKindError,
  MalformedAdaptedEvidenceError,
} from "./errors.ts"

export { SUPPORTED_INPUT_SCHEMA_VERSIONS, validateInterpreterIdentity, validateInterpretationInput } from "./validation.ts"

export { NOT_YET_INTEGRATED_EVIDENCE_CLASSES, EVIDENCE_REQUIREMENT_CLASSIFICATION, buildProvenance } from "./provenance.ts"

export { interpretNarrativeEvidence } from "./interpret.ts"

export {
  ADAPTED_EVIDENCE_SOURCE_KIND,
  NARRATIVE_IR_ADAPTER_IDENTITY,
  evidenceItemFromExpectedAbsenceFact,
  isAdaptedExpectedAbsenceEvidencePayload,
} from "./worldEvidence.ts"
export type { AdaptedExpectedAbsenceEvidencePayload } from "./worldEvidence.ts"
