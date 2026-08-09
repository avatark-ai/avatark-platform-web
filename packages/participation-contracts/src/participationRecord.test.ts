import assert from "node:assert/strict"
import { test } from "node:test"
import type { ParticipationRecord } from "./participationRecord.ts"
import type { ParticipationAuthorization, ParticipationDenialReason } from "./participationAuthorization.ts"

test("ParticipationRecord is addressable by its own id, never a generic mutable property bag, and userId sits alongside participantEntityIds -- never inside it", () => {
  const record: ParticipationRecord = {
    id: "p1",
    worldId: "living-vrindavan",
    userId: "visitor-1",
    ruleId: "yamuna-flowering-reflection",
    locationId: "yamuna",
    participantEntityIds: ["deer-1"],
    tick: 4,
    encounterRecordId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  }
  assert.equal(record.participantEntityIds.includes(record.userId as never), false)
  assert.equal(record.encounterRecordId, null, "honestly null when only the coarse AvailableEncounter layer had resolved")
})

test("ParticipationDenialReason is a fixed, exhaustively enumerable closed union", () => {
  const reasons: ParticipationDenialReason[] = ["ENCOUNTER_NOT_AVAILABLE", "NARRATIVE_GATE_CLOSED"]
  assert.equal(new Set(reasons).size, reasons.length)
})

test("ParticipationAuthorization is a discriminated union -- a denial always names exactly one reason, never a bare boolean", () => {
  const denied: ParticipationAuthorization = { authorized: false, reason: "ENCOUNTER_NOT_AVAILABLE" }
  const authorized: ParticipationAuthorization = { authorized: true }
  assert.equal(denied.authorized, false)
  assert.equal(authorized.authorized, true)
  assert.ok(!denied.authorized && typeof denied.reason === "string")
})
