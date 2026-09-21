export class NarrativeInterpretationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NarrativeInterpretationError"
  }
}

export class MalformedInterpretationInputError extends NarrativeInterpretationError {
  constructor(reason: string) {
    super(`Malformed narrative interpretation input: ${reason}`)
    this.name = "MalformedInterpretationInputError"
  }
}

export class MissingInterpreterIdentityError extends NarrativeInterpretationError {
  constructor() {
    super("Interpreter identity (name and version) is required and was not supplied or was invalid.")
    this.name = "MissingInterpreterIdentityError"
  }
}

export class UnsupportedInputSchemaVersionError extends NarrativeInterpretationError {
  constructor(schemaVersion: string, supported: readonly string[]) {
    super(`Unsupported narrative interpretation input schema version "${schemaVersion}". Supported: ${supported.join(", ")}.`)
    this.name = "UnsupportedInputSchemaVersionError"
  }
}

export class CertificationAttemptRejectedError extends NarrativeInterpretationError {
  constructor() {
    super("Narrative interpretation input must not assert its own certification, status, or authority -- only this package's own candidate shape may describe a candidate's status, and it is never certified.")
    this.name = "CertificationAttemptRejectedError"
  }
}

export class UnsupportedEvidenceKindError extends NarrativeInterpretationError {
  constructor(sourceKind: string) {
    super(`Evidence sourceKind "${sourceKind}" names a real Lane-1 evidence class this package has not yet connected (STK-WO-009 Phase B). It must not be silently accepted as opaque, undifferentiated evidence -- that would misrepresent a named, still-unintegrated authority as ordinary caller-supplied data.`)
    this.name = "UnsupportedEvidenceKindError"
  }
}

export class MalformedAdaptedEvidenceError extends NarrativeInterpretationError {
  constructor(sourceKind: string, reason: string) {
    super(`Evidence declared sourceKind "${sourceKind}" (a real, adapter-connected evidence class) but its payload does not match that class's adapted shape: ${reason}. It must not be silently repaired, downgraded to opaque, or fabricated.`)
    this.name = "MalformedAdaptedEvidenceError"
  }
}
