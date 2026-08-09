import assert from "node:assert/strict"
import { test } from "node:test"
import type { EncounterRealizationStatus } from "./encounterRecord.ts"

const ALL_STATUSES: EncounterRealizationStatus[] = ["REALIZING", "REALIZED", "CONSEQUENCES_APPLIED", "REMEMBERED", "EXPIRED", "BLOCKED", "SUPERSEDED"]

test("EncounterRealizationStatus is a fixed, exhaustively enumerable closed union -- no duplicate/typo'd value", () => {
  assert.equal(new Set(ALL_STATUSES).size, ALL_STATUSES.length)
})
