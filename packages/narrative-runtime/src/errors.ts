export class NarrativeDefinitionError extends Error {
  errors: string[]

  constructor(errors: string[]) {
    super(`Invalid narrative definition: ${errors.join("; ")}`)
    this.name = "NarrativeDefinitionError"
    this.errors = errors
  }
}

export class NarrativeRuntimeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NarrativeRuntimeError"
  }
}

export class NarrativeStateNotFoundError extends NarrativeRuntimeError {
  constructor(userId: string, narrativeId: string) {
    super(`No narrative state for user "${userId}" and narrative "${narrativeId}". Call startNarrative() first.`)
    this.name = "NarrativeStateNotFoundError"
  }
}

export class NarrativeAlreadyStartedError extends NarrativeRuntimeError {
  constructor(userId: string, narrativeId: string) {
    super(`Narrative "${narrativeId}" is already started for user "${userId}". Call resumeNarrative() instead.`)
    this.name = "NarrativeAlreadyStartedError"
  }
}

export class NarrativeInvalidChoiceError extends NarrativeRuntimeError {
  constructor(choiceId: string, beatId: string) {
    super(`"${choiceId}" is not a valid choice for beat "${beatId}".`)
    this.name = "NarrativeInvalidChoiceError"
  }
}

export class NarrativeInvalidTriggerError extends NarrativeRuntimeError {
  constructor(message: string) {
    super(message)
    this.name = "NarrativeInvalidTriggerError"
  }
}
