import { test } from "node:test"
import assert from "node:assert/strict"
import {
  CorruptCheckpointError,
  DuplicateWorldSystemEventError,
  IncompatibleWorldDefinitionError,
  InvalidCatchUpRequestError,
  LeaseConflictError,
  ProtectedNarrativeMutationAttemptError,
  StaleWorldStateVersionError,
  WorldNotFoundError,
} from "./errors.ts"

test("each Sprint 9 failure type is its own named class, not a generic Error", () => {
  const errors = [
    new WorldNotFoundError("w1"),
    new IncompatibleWorldDefinitionError("w1", "def-a", "def-b"),
    new StaleWorldStateVersionError("w1", 3, 5),
    new LeaseConflictError("w1", "owner-2"),
    new CorruptCheckpointError("w1", "ckpt-1", "missing sharedState"),
    new DuplicateWorldSystemEventError("w1", "evt-1"),
    new InvalidCatchUpRequestError("w1", "negative ticks"),
    new ProtectedNarrativeMutationAttemptError("w1"),
  ]

  const names = errors.map((e) => e.name)
  assert.equal(new Set(names).size, names.length, "every failure type has a distinct name")
  for (const error of errors) {
    assert.ok(error instanceof Error)
    assert.ok(error.message.length > 0)
  }
})
