import assert from "node:assert/strict"
import { test } from "node:test"
import { resolveParticipationAuthorization } from "./participationAuthorization.ts"

test("denies with ENCOUNTER_NOT_AVAILABLE when the live snapshot does not currently list the rule -- never a fabricated success", () => {
  const result = resolveParticipationAuthorization({ availableViaLiveSnapshot: false, narrativeGateOpen: true })
  assert.deepEqual(result, { authorized: false, reason: "ENCOUNTER_NOT_AVAILABLE" })
})

test("denies with NARRATIVE_GATE_CLOSED when the rule is available but the protected-narrative gate has not resolved open", () => {
  const result = resolveParticipationAuthorization({ availableViaLiveSnapshot: true, narrativeGateOpen: false })
  assert.deepEqual(result, { authorized: false, reason: "NARRATIVE_GATE_CLOSED" })
})

test("authorizes when the rule is live-available and the narrative gate is open", () => {
  const result = resolveParticipationAuthorization({ availableViaLiveSnapshot: true, narrativeGateOpen: true })
  assert.deepEqual(result, { authorized: true })
})

test("ENCOUNTER_NOT_AVAILABLE takes precedence when both conditions fail -- one denial reason, never two", () => {
  const result = resolveParticipationAuthorization({ availableViaLiveSnapshot: false, narrativeGateOpen: false })
  assert.deepEqual(result, { authorized: false, reason: "ENCOUNTER_NOT_AVAILABLE" })
})
