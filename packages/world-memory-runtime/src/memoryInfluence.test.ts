import { test } from "node:test"
import assert from "node:assert/strict"
import { resolvePreferredResourceLocation } from "./memoryInfluence.ts"
import type { EntityMemoryEntry } from "@avatark/world-memory-contracts"

function entry(overrides: Partial<EntityMemoryEntry>): EntityMemoryEntry {
  return { id: "e1", worldId: "w1", entityId: "cow-1", type: "PREVIOUS_RESOURCE_LOCATION", tick: 1, detail: {}, significance: "MEANINGFUL", provenance: { derivedFromEventIds: [], derivationRule: "test", causalReferences: [] }, ...overrides }
}

test("resolvePreferredResourceLocation returns null when no PREVIOUS_RESOURCE_LOCATION entry exists", () => {
  assert.equal(resolvePreferredResourceLocation([]), null)
  assert.equal(resolvePreferredResourceLocation([entry({ type: "RECENT_RELOCATION", detail: { locationId: "yamuna" } })]), null)
})

test("resolvePreferredResourceLocation picks the MOST RECENT remembered location among several", () => {
  const entries = [
    entry({ tick: 5, detail: { locationId: "yamuna" } }),
    entry({ tick: 12, detail: { locationId: "kadamba-grove" } }),
    entry({ tick: 8, detail: { locationId: "govardhan-path" } }),
  ]
  assert.equal(resolvePreferredResourceLocation(entries), "kadamba-grove")
})
