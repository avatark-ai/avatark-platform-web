import { test } from "node:test"
import assert from "node:assert/strict"
import { getEmbodimentWithCanonicalEvents, wakeWorldWithCanonicalEvents } from "./hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

const SEED_NOW = () => "2026-08-09T00:00:00.000Z"
const ADVANCED_NOW = () => "2026-08-09T00:00:00.001Z"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

// Sprint 18 Phase 0 §28's own acceptance-proof matrix. Proof A (Canon
// Immutability) is enforced statically by
// lib/runtimeKernel/dependencyBoundaries.test.ts's own extended regex
// scan, not re-tested here. Proofs B (Authorized Projection) and C
// (Replay Safety) are covered by lib/canonicalEvents/hostService.test.ts's
// own activation/replay tests. Proof D (Visitor Absence) is covered by
// hostService.test.ts's own witness test. Proof E (Different World
// Responses) and multi-instance isolation are covered by
// lib/canonicalEvents/multiInstance.test.ts. Proof G (World Neutrality)
// is covered by packages/canonical-event-runtime's own
// livingForestCanonicalEventPortability.test.ts. This file covers the
// one remaining proof: F (Renderer Parity).
test("SCENARIO F: the embodiment projection a renderer receives carries only semantic fields -- no geometry, no engine-specific type, identical structure regardless of which renderer eventually consumes it", async () => {
  const worldInstanceId = "world-18-scenario-f-renderer-parity"
  await wakeWorldWithCanonicalEvents(worldInstanceId, "owner-1", SEED_NOW)
  await releaseLease(worldInstanceId, "owner-1")
  await wakeWorldWithCanonicalEvents(worldInstanceId, "owner-1", ADVANCED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  const embodiment = await getEmbodimentWithCanonicalEvents(worldInstanceId, "visitor-1", "govardhan-path", ["govardhan-path"], 0, ADVANCED_NOW)

  assert.equal(embodiment.canonicalProjections.length, 1)
  const projection = embodiment.canonicalProjections[0]
  assert.equal(projection.status, "COMPLETED")

  // The ENTIRE projection payload, serialized, contains no
  // renderer/engine-specific token -- the same inspection-based proof
  // method every sibling sprint's own renderer-neutrality check already
  // uses, applied here to the actual OUTPUT a renderer would receive,
  // not merely the source code that produced it.
  const serialized = JSON.stringify(embodiment)
  for (const forbidden of ["Actor", "UObject", "Blueprint", "React", "<div", "className", "position:", "geometry"]) {
    assert.ok(!serialized.includes(forbidden), `embodiment payload unexpectedly contains "${forbidden}"`)
  }

  // Every mandated fact is an intent string, never a render instruction.
  assert.deepEqual(projection.mandatedFacts, [{ kind: "LOCATION_ACTIVE", locationId: "govardhan-path" }])
})
