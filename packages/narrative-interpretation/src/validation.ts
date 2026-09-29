import {
  CertificationAttemptRejectedError,
  MalformedAdaptedEvidenceError,
  MalformedInterpretationInputError,
  MissingInterpreterIdentityError,
  UnsupportedEvidenceKindError,
  UnsupportedInputSchemaVersionError,
} from "./errors.ts"
import { NOT_YET_INTEGRATED_EVIDENCE_CLASSES } from "./provenance.ts"
import { ADAPTED_EVIDENCE_SOURCE_KIND, isAdaptedExpectedAbsenceEvidencePayload } from "./worldEvidence.ts"
import {
  OCCURRENCE_EVIDENCE_KIND,
  WORLD_HISTORY_ENTRY_EVIDENCE_KIND,
  isOccurrenceEvidencePayload,
  isWorldHistoryEntryEvidencePayload,
} from "./worldHistoryEvidence.ts"
import { PLACE_CAUSAL_HISTORY_EVIDENCE_KIND, isPlaceCausalHistoryReferenceEvidencePayload } from "./causalHistoryEvidence.ts"
import { PHYSICAL_CONSEQUENCE_EVIDENCE_KIND, isPhysicalConsequenceEvidencePayload } from "./physicalConsequenceEvidence.ts"
import type { InterpreterIdentity, NarrativeEvidenceItem, NarrativeInterpretationInput } from "./types.ts"

export const SUPPORTED_INPUT_SCHEMA_VERSIONS: readonly string[] = ["1"]

export function validateInterpreterIdentity(identity: InterpreterIdentity | undefined | null): InterpreterIdentity {
  if (!identity || typeof identity !== "object") {
    throw new MissingInterpreterIdentityError()
  }
  if (identity.name !== "narrative-interpretation" || typeof identity.version !== "string" || identity.version.length === 0) {
    throw new MissingInterpreterIdentityError()
  }
  return identity
}

function validateEvidenceItem(item: unknown, index: number): NarrativeEvidenceItem {
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    throw new MalformedInterpretationInputError(`evidence[${index}] must be an object`)
  }
  const record = item as Record<string, unknown>
  if (typeof record.evidenceId !== "string" || record.evidenceId.length === 0) {
    throw new MalformedInterpretationInputError(`evidence[${index}].evidenceId is required and must be a non-empty string`)
  }
  if (typeof record.sourceKind !== "string" || record.sourceKind.length === 0) {
    throw new MalformedInterpretationInputError(`evidence[${index}].sourceKind is required and must be a non-empty string`)
  }
  if (!("payload" in record)) {
    throw new MalformedInterpretationInputError(`evidence[${index}].payload is required`)
  }

  if (NOT_YET_INTEGRATED_EVIDENCE_CLASSES.includes(record.sourceKind)) {
    throw new UnsupportedEvidenceKindError(record.sourceKind)
  }
  if (record.sourceKind === WORLD_HISTORY_ENTRY_EVIDENCE_KIND && !isWorldHistoryEntryEvidencePayload(record.payload)) {
    throw new MalformedAdaptedEvidenceError(record.sourceKind, "payload does not match the adapted WORLD_HISTORY entry shape (missing/invalid adapterIdentity, source, poolKey, poolAuthority, poolIrVersion, position, entryRef, or reference)")
  }
  if (record.sourceKind === OCCURRENCE_EVIDENCE_KIND && !isOccurrenceEvidencePayload(record.payload)) {
    throw new MalformedAdaptedEvidenceError(record.sourceKind, "payload does not match the adapted Occurrence shape (missing/invalid adapterIdentity, source, occurrenceKey, irVersion, persistence, or observations)")
  }
  if (record.sourceKind === PLACE_CAUSAL_HISTORY_EVIDENCE_KIND && !isPlaceCausalHistoryReferenceEvidencePayload(record.payload)) {
    throw new MalformedAdaptedEvidenceError(record.sourceKind, "payload does not match the adapted PlaceMemory.causalHistory reference shape (missing/invalid adapterIdentity, source, placeMemoryKey, placeId, placeMemoryIrVersion, position, targetRef, referenceFamily, or targetMaterialized)")
  }
  if (record.sourceKind === PHYSICAL_CONSEQUENCE_EVIDENCE_KIND && !isPhysicalConsequenceEvidencePayload(record.payload)) {
    throw new MalformedAdaptedEvidenceError(record.sourceKind, "payload does not match the adapted PhysicalConsequence shape (missing/invalid adapterIdentity, source, consequenceKey, irVersion, register PHYSICAL, triggerId, causalAttribution, evidenceTiming, persistence, or worldStateDelta)")
  }
  if (record.sourceKind === ADAPTED_EVIDENCE_SOURCE_KIND && !isAdaptedExpectedAbsenceEvidencePayload(record.payload)) {
    throw new MalformedAdaptedEvidenceError(record.sourceKind, "payload does not match the adapted PlaceMemory.expectedPatternState shape (missing/invalid adapterIdentity, expectationId, subjectId, property, origin, evidenceStateIds, logicalTick, disconfirmationCount, or artifactReference)")
  }

  return { evidenceId: record.evidenceId, sourceKind: record.sourceKind, payload: record.payload }
}

export function validateInterpretationInput(input: unknown): NarrativeInterpretationInput {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new MalformedInterpretationInputError("input must be a plain object")
  }
  const record = input as Record<string, unknown>

  if (record.certified !== undefined || record.status !== undefined) {
    throw new CertificationAttemptRejectedError()
  }

  if (typeof record.schemaVersion !== "string" || record.schemaVersion.length === 0) {
    throw new MalformedInterpretationInputError("schemaVersion is required and must be a non-empty string")
  }
  if (!SUPPORTED_INPUT_SCHEMA_VERSIONS.includes(record.schemaVersion)) {
    throw new UnsupportedInputSchemaVersionError(record.schemaVersion, SUPPORTED_INPUT_SCHEMA_VERSIONS)
  }

  if (!Array.isArray(record.evidence)) {
    throw new MalformedInterpretationInputError("evidence must be an array")
  }

  const evidence = record.evidence.map((item, index) => validateEvidenceItem(item, index))

  return { schemaVersion: record.schemaVersion, evidence }
}
