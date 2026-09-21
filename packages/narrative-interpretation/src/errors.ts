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
