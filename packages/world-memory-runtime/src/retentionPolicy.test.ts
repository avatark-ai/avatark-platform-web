import { test } from "node:test"
import assert from "node:assert/strict"
import { ageRetentionTier, compactWorldEvents, initialRetentionTier } from "./retentionPolicy.ts"
import type { WorldEvent } from "@avatark/world-memory-contracts"

function event(overrides: Partial<WorldEvent>): WorldEvent {
  return {
    id: "evt-1",
    worldId: "w1",
    tick: 10,
    category: "ENVIRONMENTAL_THRESHOLD",
    locationId: null,
    participantEntityIds: [],
    causalReferences: [],
    consequences: [],
    significance: "MEANINGFUL",
    retentionTier: "RECENT",
    provenance: { derivedFromEventIds: [], derivationRule: "test", causalReferences: [] },
    occurredAt: "2026-08-09T00:00:00.000Z",
    ...overrides,
  }
}

test("initialRetentionTier: LANDMARK significance always starts LANDMARK; everything else starts RECENT", () => {
  assert.equal(initialRetentionTier("LANDMARK"), "LANDMARK")
  assert.equal(initialRetentionTier("MEANINGFUL"), "RECENT")
})

test("ageRetentionTier ages RECENT -> DURABLE -> COMPACTABLE as tick distance grows, using the policy's own windows", () => {
  const policy = { recentWindowTicks: 10, durableWindowTicks: 50 }
  const e = event({ tick: 100 })
  assert.equal(ageRetentionTier(e, 100, policy), "RECENT")
  assert.equal(ageRetentionTier(e, 109, policy), "RECENT")
  assert.equal(ageRetentionTier(e, 110, policy), "DURABLE")
  assert.equal(ageRetentionTier(e, 149, policy), "DURABLE")
  assert.equal(ageRetentionTier(e, 150, policy), "COMPACTABLE")
})

test("a LANDMARK-tiered event never ages, no matter how old", () => {
  const e = event({ tick: 0, retentionTier: "LANDMARK" })
  assert.equal(ageRetentionTier(e, 10_000, { recentWindowTicks: 1, durableWindowTicks: 2 }), "LANDMARK")
})

test("compactWorldEvents drops only events that have aged to COMPACTABLE, keeping landmarks and recent/durable events", () => {
  const policy = { recentWindowTicks: 10, durableWindowTicks: 50 }
  const events = [
    event({ id: "old", tick: 0 }),
    event({ id: "landmark", tick: 0, significance: "LANDMARK", retentionTier: "LANDMARK" }),
    event({ id: "recent", tick: 145 }),
  ]
  const result = compactWorldEvents(events, 150, policy)
  assert.deepEqual(result.compactedIds, ["old"])
  assert.deepEqual(result.kept.map((e) => e.id).sort(), ["landmark", "recent"])
})
