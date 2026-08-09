import { test } from "node:test"
import assert from "node:assert/strict"
import { getSpatialMovementContext, getSpatialSnapshot, wakeWorldWithSpatialEcology } from "./hostService.ts"
import { territoryClaimRepository } from "./singleton.ts"
import { applyWorldAdaptation } from "../worldAdaptation/hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

const FIXED_NOW = () => "2026-08-09T00:00:00.000Z"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

test("wakeWorldWithSpatialEcology: composes Sprint 15's own adaptation wake, unmodified -- produces the full 4-Patch Vrindavan spatial snapshot", async () => {
  const worldInstanceId = "world-16-wake-composition"
  const result = await wakeWorldWithSpatialEcology(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  assert.equal(result.spatial.patchStates.length, 4, "one PatchState per already-authorized Vrindavan location -- no invented geography")
  assert.ok(result.spatial.patchStates.some((p) => p.patchId === "patch-yamuna"))
  assert.ok(result.spatial.patchStates.some((p) => p.patchId === "patch-kadamba-grove"))
  assert.ok(result.spatial.patchStates.some((p) => p.patchId === "patch-govardhan-path"))
  assert.ok(result.spatial.patchStates.some((p) => p.patchId === "patch-vrindavan-entry"))
  assert.equal(result.spatial.routeStates.length, 1)
  assert.equal(result.spatial.routeStates[0].routeId, "route-govardhan-path")
  assert.equal(result.spatial.routeStates[0].traversable, true, "the Govardhan Path corridor is traversable -- no BARRIER is authorized anywhere in Vrindavan's own grammar")
})

test("wakeWorldWithSpatialEcology: derives TerritoryClaims from Sprint 12's own real seeded HomeRanges, never a fabricated one", async () => {
  const worldInstanceId = "world-16-territory-from-homerange"
  await wakeWorldWithSpatialEcology(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  const claims = await territoryClaimRepository.listByWorld(worldInstanceId)
  // Sprint 12's own seeded HomeRanges: the cow herd's home range is
  // ["yamuna"], the bird flock's is ["kadamba-grove"] -- one PRIMARY
  // claim each, on the correct Patch, no contest.
  assert.equal(claims.length, 2)
  const cowClaim = claims.find((c) => c.patchId === "patch-yamuna")
  const birdClaim = claims.find((c) => c.patchId === "patch-kadamba-grove")
  assert.ok(cowClaim)
  assert.ok(birdClaim)
  assert.equal(cowClaim!.strength, "PRIMARY")
  assert.equal(birdClaim!.strength, "PRIMARY")

  const snapshot = await getSpatialSnapshot(worldInstanceId, FIXED_NOW)
  assert.ok(snapshot.territoryPressures.every((p) => p.overlappingClaimCount === 1), "two DIFFERENT groups each own their own Patch today -- no overlap exists in the real Vrindavan seed")
})

test("Spatial causal proof: a real, persisted Sprint 15 PLACE/RESOURCE_PRESSURE adaptation effect at Yamuna raises exactly that Patch's own ecologicalPressure, never a neighboring Patch's", async () => {
  const worldInstanceId = "world-16-spatial-causal-proof"
  await wakeWorldWithSpatialEcology(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  const before = await getSpatialSnapshot(worldInstanceId, FIXED_NOW)
  assert.equal(before.patchStates.find((p) => p.patchId === "patch-yamuna")!.ecologicalPressure, 0)

  // The SAME existing Sprint 15 mechanism SCENARIO D's own test already
  // proves (lib/worldAdaptation/scenarios.test.ts) -- water observed
  // persistently unavailable at Yamuna accrues bounded resource
  // pressure once the rule's own threshold (2) is crossed. Composed
  // here, never reimplemented.
  let lastResult
  for (let tick = 1; tick <= 6; tick++) {
    lastResult = await applyWorldAdaptation({
      worldId: worldInstanceId,
      tick,
      realizedEncounters: [],
      resourceReadings: [{ locationId: "yamuna", category: "water", available: false, tick }],
      presentEntityIdsByLocation: new Map([["yamuna", ["avatark-population-cow-1"]]]),
    })
    if (lastResult.effects.some((e) => e.domain === "PLACE" && e.kind === "RESOURCE_PRESSURE")) break
  }
  assert.ok(lastResult!.effects.some((e) => e.domain === "PLACE" && e.kind === "RESOURCE_PRESSURE"), "the pre-existing adaptation rule actually crossed its own threshold")

  const after = await getSpatialSnapshot(worldInstanceId, FIXED_NOW)
  assert.equal(after.patchStates.find((p) => p.patchId === "patch-yamuna")!.ecologicalPressure, 1, "encounter/resource consequence -> adaptation -> Patch-level ecological pressure changed")
  assert.equal(after.patchStates.find((p) => p.patchId === "patch-kadamba-grove")!.ecologicalPressure, 0, "pressure never leaks into a neighboring Patch that was not the effect's own locationId")
  assert.equal(after.patchStates.find((p) => p.patchId === "patch-govardhan-path")!.ecologicalPressure, 0)
})

test("Replay: getSpatialSnapshot is a pure derivation -- calling it twice against the identical durable/persisted state produces byte-identical results", async () => {
  const worldInstanceId = "world-16-replay-determinism"
  await wakeWorldWithSpatialEcology(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  const first = await getSpatialSnapshot(worldInstanceId, FIXED_NOW)
  const second = await getSpatialSnapshot(worldInstanceId, FIXED_NOW)
  assert.deepEqual(first, second, "no repository is consulted by resolvePatchState/resolveTerritoryPressure beyond already-durable state -- recomputing never drifts")
})

test("Multi-instance isolation: two world instances with the identical Vrindavan grammar never share TerritoryClaims or SpatialSnapshot state", async () => {
  const worldA = "world-16-multi-instance-a"
  const worldB = "world-16-multi-instance-b"

  await wakeWorldWithSpatialEcology(worldA, "owner-a", FIXED_NOW)
  await releaseLease(worldA, "owner-a")
  await wakeWorldWithSpatialEcology(worldB, "owner-b", FIXED_NOW)
  await releaseLease(worldB, "owner-b")

  // Push world A into resource pressure at Yamuna; world B must be unaffected.
  for (let tick = 1; tick <= 6; tick++) {
    const result = await applyWorldAdaptation({
      worldId: worldA,
      tick,
      realizedEncounters: [],
      resourceReadings: [{ locationId: "yamuna", category: "water", available: false, tick }],
      presentEntityIdsByLocation: new Map([["yamuna", ["avatark-population-cow-1"]]]),
    })
    if (result.effects.some((e) => e.domain === "PLACE" && e.kind === "RESOURCE_PRESSURE")) break
  }

  const snapshotA = await getSpatialSnapshot(worldA, FIXED_NOW)
  const snapshotB = await getSpatialSnapshot(worldB, FIXED_NOW)
  assert.equal(snapshotA.patchStates.find((p) => p.patchId === "patch-yamuna")!.ecologicalPressure, 1)
  assert.equal(snapshotB.patchStates.find((p) => p.patchId === "patch-yamuna")!.ecologicalPressure, 0, "world B's own Patch state is untouched by world A's adaptation history")

  const claimsA = await territoryClaimRepository.listByWorld(worldA)
  const claimsB = await territoryClaimRepository.listByWorld(worldB)
  assert.ok(claimsA.every((c) => c.worldId === worldA))
  assert.ok(claimsB.every((c) => c.worldId === worldB))
})

test("getSpatialMovementContext: composes membership + topology + territory for a real seeded entity, reaching every Patch through the Yamuna hub", async () => {
  const worldInstanceId = "world-16-movement-context"
  await wakeWorldWithSpatialEcology(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  const context = await getSpatialMovementContext(worldInstanceId, "avatark-population-cow-1", FIXED_NOW)
  assert.ok(context)
  assert.equal(context!.currentPatchId, "patch-yamuna")
  assert.deepEqual(context!.reachablePatchIds.sort(), ["patch-govardhan-path", "patch-kadamba-grove", "patch-vrindavan-entry", "patch-yamuna"])
  assert.equal(context!.ownTerritoryClaims.length, 1)
  assert.equal(context!.ownTerritoryClaims[0].patchId, "patch-yamuna")
})

test("getSpatialMovementContext: an unknown entityId resolves to null, never a fabricated context", async () => {
  const worldInstanceId = "world-16-movement-context-unknown-entity"
  await wakeWorldWithSpatialEcology(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  const context = await getSpatialMovementContext(worldInstanceId, "entity-does-not-exist", FIXED_NOW)
  assert.equal(context, null)
})
