import { test } from "node:test"
import assert from "node:assert/strict"
import { nextLifecycleState, resourceTier } from "./lifecycle.ts"

// Test matrix #7: dormant -> wake transition.
test("a dormant world transitions to WAKING when a visitor arrives, then to ACTIVE once catch-up completes", () => {
  const waking = nextLifecycleState("DORMANT", "visitor_arrived")
  assert.equal(waking, "WAKING")
  const active = nextLifecycleState(waking!, "catch_up_complete")
  assert.equal(active, "ACTIVE")
})

test("an active world quiesces after its no-activity deadline, then checkpoints back to dormant", () => {
  const quiescing = nextLifecycleState("ACTIVE", "no_activity_deadline_reached")
  assert.equal(quiescing, "QUIESCING")
  const dormant = nextLifecycleState(quiescing!, "checkpoint_complete")
  assert.equal(dormant, "DORMANT")
})

test("a visitor arriving while quiescing cancels the quiesce and returns straight to active", () => {
  assert.equal(nextLifecycleState("QUIESCING", "visitor_arrived"), "ACTIVE")
})

test("an illegal transition (waking while already active) returns null, never a silent no-op state", () => {
  assert.equal(nextLifecycleState("ACTIVE", "visitor_arrived"), null)
})

test("crash_detected from any state routes back through WAKING for re-recovery", () => {
  for (const state of ["DORMANT", "WAKING", "ACTIVE"] as const) {
    assert.equal(nextLifecycleState(state, "crash_detected"), "WAKING")
  }
})

// Phase 11: HOT/WARM/COLD is a pure derived mapping.
test("resource tier is derived from lifecycle state: DORMANT=COLD, WAKING/QUIESCING=WARM, ACTIVE=HOT", () => {
  assert.equal(resourceTier("DORMANT"), "COLD")
  assert.equal(resourceTier("WAKING"), "WARM")
  assert.equal(resourceTier("ACTIVE"), "HOT")
  assert.equal(resourceTier("QUIESCING"), "WARM")
})
