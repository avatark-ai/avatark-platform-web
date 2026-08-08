import { test } from "node:test"
import assert from "node:assert/strict"
import { isSaveConflict } from "./concurrency.ts"
import type { ConditionalSaveResult } from "./concurrency.ts"

test("isSaveConflict narrows a conflict result and never a saved result", () => {
  const saved: ConditionalSaveResult<{ tick: number }> = { status: "saved", stateVersion: 2 }
  const conflict: ConditionalSaveResult<{ tick: number }> = { status: "conflict", currentVersion: 3, currentState: { tick: 9 } }

  assert.equal(isSaveConflict(saved), false)
  assert.equal(isSaveConflict(conflict), true)
  if (isSaveConflict(conflict)) {
    assert.equal(conflict.currentState.tick, 9, "conflict result carries the state actually stored, for a caller to inspect")
  }
})
