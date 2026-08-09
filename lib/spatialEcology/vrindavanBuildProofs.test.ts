import { test } from "node:test"
import assert from "node:assert/strict"
import { wakeWorldWithSpatialEcology } from "./hostService.ts"
import { VRINDAVAN_SPATIAL_EDGES } from "./vrindavanSpatialDefinition.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

const FIXED_NOW = () => "2026-08-09T00:00:00.000Z"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

// Living Vrindavan Build 01, Phase F: geometric nearness vs semantic
// reachability vs authored transition legality must NOT collapse into
// one thing. Kadamba Grove and Govardhan Path are each exactly one hop
// from Yamuna (the real, StudioK-authored star topology) -- a renderer
// naively placing them "near" each other on a map must not be allowed
// to imply a direct legal transition. There is no edge connecting them.
test("Living Vrindavan topology: Kadamba Grove and Govardhan Path are each reachable via Yamuna, but have NO direct edge between them", () => {
  const direct = VRINDAVAN_SPATIAL_EDGES.find(
    (e) =>
      (e.fromPatchId === "patch-kadamba-grove" && e.toPatchId === "patch-govardhan-path") ||
      (e.fromPatchId === "patch-govardhan-path" && e.toPatchId === "patch-kadamba-grove"),
  )
  assert.equal(direct, undefined, "no authored edge exists between Kadamba Grove and Govardhan Path -- transitive reachability through Yamuna is not the same as direct adjacency")

  const viaYamunaToKadamba = VRINDAVAN_SPATIAL_EDGES.some((e) => (e.fromPatchId === "patch-yamuna" && e.toPatchId === "patch-kadamba-grove") || (e.toPatchId === "patch-yamuna" && e.fromPatchId === "patch-kadamba-grove"))
  const viaYamunaToGovardhan = VRINDAVAN_SPATIAL_EDGES.some((e) => (e.fromPatchId === "patch-yamuna" && e.toPatchId === "patch-govardhan-path") || (e.toPatchId === "patch-yamuna" && e.fromPatchId === "patch-govardhan-path"))
  assert.ok(viaYamunaToKadamba && viaYamunaToGovardhan, "both are real, legally reachable -- only ever via Yamuna, never directly")
})

// Living Vrindavan Build 01, Phase H: the world must not begin as one
// homogeneous 500m square. `resolvePatchState` deliberately shares one
// world-global vegetation/hydrology band across every Patch (Sprint 16
// Phase 0's own documented scope limit -- no Canon-authorized basis for
// per-habitat weighting exists yet); what IS genuinely Patch-specific
// from tick 0 is resourceAvailability (real StudioK-role-derived
// resource tags) and initial occupancy (the real seeded cow herd/bird
// flock). This test proves the real, current differentiation
// mechanism -- it does not assert a per-habitat environmental band that
// does not exist.
test("Living Vrindavan patch ecology: Yamuna and Kadamba Grove differ meaningfully at world initialization", async () => {
  const worldInstanceId = "living-vrindavan-build-01-patch-differentiation"
  const result = await wakeWorldWithSpatialEcology(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  const yamuna = result.spatial.patchStates.find((p) => p.patchId === "patch-yamuna")!
  const kadambaGrove = result.spatial.patchStates.find((p) => p.patchId === "patch-kadamba-grove")!

  assert.notDeepEqual(yamuna.resourceAvailability, kadambaGrove.resourceAvailability, "Yamuna affords water; Kadamba Grove affords vegetation/shelter/rest -- real, StudioK-role-derived, not identical")
  assert.ok(yamuna.resourceAvailability.includes("water"))
  assert.ok(kadambaGrove.resourceAvailability.includes("vegetation"))

  assert.notDeepEqual(yamuna.presentEntityIds.slice().sort(), kadambaGrove.presentEntityIds.slice().sort(), "the real seeded cow herd occupies Yamuna; the real seeded bird flock occupies Kadamba Grove -- distinct populations, not a homogeneous square")
  assert.ok(yamuna.presentEntityIds.some((id) => id.startsWith("avatark-population-cow")))
  assert.ok(kadambaGrove.presentEntityIds.some((id) => id.startsWith("avatark-population-bird-flock")))
})

// Living Vrindavan Build 01, Phase I: season -> environment -> patch
// ecology -> living entity conditions must be real at tick 0, not only
// after some elapsed simulated time.
test("Living Vrindavan initial state: Vasanta's real environmental envelope is reflected in patch ecology at world initialization", async () => {
  const worldInstanceId = "living-vrindavan-build-01-vasanta-init"
  const result = await wakeWorldWithSpatialEcology(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  assert.equal(result.spatial.tick, 0)
  // Vasanta's own real environmentalEnvelope (living-vrindavan.systems.json):
  // vegetationActivityBand "high", hydrologyBaselineBand "moderate" --
  // read straight through Sprint 7's EnvironmentalState into every
  // Patch's own vegetationCondition/hydrologyCondition (Sprint 16's
  // documented single-world-global pass-through).
  for (const patch of result.spatial.patchStates) {
    assert.equal(patch.vegetationCondition, "high", `patch ${patch.patchId} must reflect Vasanta's real vegetationActivityBand`)
    assert.equal(patch.hydrologyCondition, "moderate", `patch ${patch.patchId} must reflect Vasanta's real hydrologyBaselineBand`)
  }
})
