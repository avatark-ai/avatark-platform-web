import {
  CertificationAttemptRejectedError,
  MalformedInterpretationInputError,
  MissingInterpreterIdentityError,
  UnsupportedInputSchemaVersionError,
} from "./errors.ts"
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
