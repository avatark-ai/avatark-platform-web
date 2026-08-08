// Sprint 9, Phase 17: explicit failure types. Each condition below is a
// distinct, named error -- callers branch on `instanceof`, nothing here
// collapses into a generic "operation failed" fallback, and nothing
// silently substitutes a default value in place of failing.
//
// Two of these (StaleWorldStateVersionError-adjacent conflicts and
// LeaseConflictError-adjacent conflicts) also have non-throwing RESULT
// forms (ConditionalSaveResult, LeaseAcquireResult) for the expected,
// first-class "someone else already won" case a normal caller must
// branch on. These Error classes exist for callers that skip the
// conditional path entirely (e.g. `advance()` without checking a
// version first) or for conditions that are never an expected outcome
// of a well-formed call.

export class WorldNotFoundError extends Error {
  constructor(worldInstanceId: string) {
    super(`World instance not found: ${worldInstanceId}`)
    this.name = "WorldNotFoundError"
  }
}

export class IncompatibleWorldDefinitionError extends Error {
  constructor(worldInstanceId: string, expectedDefinitionId: string, actualDefinitionId: string) {
    super(`World instance ${worldInstanceId} was created from definition "${expectedDefinitionId}" but is being addressed as "${actualDefinitionId}"`)
    this.name = "IncompatibleWorldDefinitionError"
  }
}

export class StaleWorldStateVersionError extends Error {
  constructor(worldInstanceId: string, expectedVersion: number | null, currentVersion: number) {
    super(`World instance ${worldInstanceId}: expected state version ${expectedVersion ?? "none"}, current is ${currentVersion}`)
    this.name = "StaleWorldStateVersionError"
  }
}

export class LeaseConflictError extends Error {
  constructor(worldInstanceId: string, heldByOwnerId: string) {
    super(`World instance ${worldInstanceId}: execution lease already held by ${heldByOwnerId}`)
    this.name = "LeaseConflictError"
  }
}

export class CorruptCheckpointError extends Error {
  constructor(worldInstanceId: string, checkpointId: string, reason: string) {
    super(`World instance ${worldInstanceId}: checkpoint ${checkpointId} is corrupt: ${reason}`)
    this.name = "CorruptCheckpointError"
  }
}

export class DuplicateWorldSystemEventError extends Error {
  constructor(worldInstanceId: string, eventId: string) {
    super(`World instance ${worldInstanceId}: event ${eventId} conflicts with an existing, differently-shaped event of the same id`)
    this.name = "DuplicateWorldSystemEventError"
  }
}

export class InvalidCatchUpRequestError extends Error {
  constructor(worldInstanceId: string, reason: string) {
    super(`World instance ${worldInstanceId}: invalid catch-up request: ${reason}`)
    this.name = "InvalidCatchUpRequestError"
  }
}

export class ProtectedNarrativeMutationAttemptError extends Error {
  constructor(worldInstanceId: string) {
    super(`World instance ${worldInstanceId}: protected canonical narrative state is read-only from the simulation's perspective and cannot be mutated`)
    this.name = "ProtectedNarrativeMutationAttemptError"
  }
}
