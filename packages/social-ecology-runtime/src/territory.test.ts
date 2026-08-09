import assert from "node:assert/strict"
import { test } from "node:test"
import { resolvePlaceAttachment } from "./territory.ts"

test("resolvePlaceAttachment: no HomeRange record at all is treated as always within range", () => {
  const attachment = resolvePlaceAttachment("ENTITY", "cow-a", "loc-1", null)
  assert.equal(attachment.withinHomeRange, true)
  assert.deepEqual(attachment.preferredLocationIds, [])
})

test("resolvePlaceAttachment: an empty preferredLocationIds list is treated as always within range", () => {
  const homeRange = { id: "hr-1", worldId: "world-1", ownerType: "ENTITY" as const, ownerId: "cow-a", preferredLocationIds: [], establishedTick: 0 }
  const attachment = resolvePlaceAttachment("ENTITY", "cow-a", "loc-99", homeRange)
  assert.equal(attachment.withinHomeRange, true)
})

test("resolvePlaceAttachment: current location inside preferredLocationIds is within range", () => {
  const homeRange = { id: "hr-1", worldId: "world-1", ownerType: "GROUP" as const, ownerId: "group-1", preferredLocationIds: ["loc-1", "loc-2"], establishedTick: 0 }
  const attachment = resolvePlaceAttachment("GROUP", "group-1", "loc-2", homeRange)
  assert.equal(attachment.withinHomeRange, true)
  assert.equal(attachment.currentLocationId, "loc-2")
})

test("resolvePlaceAttachment: current location outside preferredLocationIds is not within range", () => {
  const homeRange = { id: "hr-1", worldId: "world-1", ownerType: "ENTITY" as const, ownerId: "cow-a", preferredLocationIds: ["loc-1", "loc-2"], establishedTick: 0 }
  const attachment = resolvePlaceAttachment("ENTITY", "cow-a", "loc-3", homeRange)
  assert.equal(attachment.withinHomeRange, false)
  assert.deepEqual(attachment.preferredLocationIds, ["loc-1", "loc-2"])
})
