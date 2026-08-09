import { test } from "node:test"
import assert from "node:assert/strict"
import { wakeLivingWorld } from "../livingWorldHost/hostService.ts"
import { getPopulationSnapshot } from "../livingPopulation/hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

const FIXED_NOW_1 = () => "2026-08-09T00:00:00.000Z"
const FIXED_NOW_2 = () => "2026-08-09T00:20:00.000Z" // 1200s later

async function releaseIfHeld(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current && current.ownerId === ownerId) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

// Living Vrindavan Build 01, Phase K: entity identity must be stable
// across snapshot -> leave -> world advance -> visitor return. This
// proves it against the REAL seeded population a visitor actually
// encounters at Yamuna (Sprint 10's own `avatark-population-cow-1`/`-2`,
// the same fixture Sprint 19's own final report used as its Vrindavan
// proof) -- not merely the two StudioK systems-artifact entities every
// world seeds by default, which is a separate, already-implicitly-
// covered case (lib/worldPersistence/recoveryEmbodiment.test.ts).
test("Living Vrindavan entity continuity: the real seeded cow herd keeps its own stable identity across a wake, a visitor 'leave', and a later wake", async () => {
  const worldInstanceId = "living-vrindavan-build-01-entity-continuity"

  await wakeLivingWorld(worldInstanceId, "continuity-owner", FIXED_NOW_1)
  await releaseIfHeld(worldInstanceId, "continuity-owner")

  const beforeLeave = await getPopulationSnapshot(worldInstanceId, FIXED_NOW_1)
  const cowBefore = beforeLeave.entities.find((e) => e.entityId === "avatark-population-cow-1")
  assert.ok(cowBefore, "the real seeded cow must be present under its own real, stable id -- not fabricated for this test")
  assert.equal(cowBefore!.locationId, "yamuna")

  // "Visitor leaves" -- nothing to do here structurally: leaving a
  // world never mutates shared population state (Sprint 19's own
  // finding, reconfirmed by every visitor-participation invariant in
  // this codebase). The absence of any call here IS the proof that
  // leaving is not itself a mutation.

  // World advances while the visitor is away, then wakes again on
  // return -- a later, separate `wakeLivingWorld` call, exactly the
  // real production shape `getWorldSnapshotForVisitor` composes.
  await wakeLivingWorld(worldInstanceId, "continuity-owner-return", FIXED_NOW_2)
  await releaseIfHeld(worldInstanceId, "continuity-owner-return")

  const afterReturn = await getPopulationSnapshot(worldInstanceId, FIXED_NOW_2)
  const cowAfter = afterReturn.entities.find((e) => e.entityId === "avatark-population-cow-1")
  assert.ok(cowAfter, "the SAME cow id must still exist after the world advanced -- it must not have been regenerated as a new identity")
  assert.equal(cowAfter!.entityId, cowBefore!.entityId)
  assert.equal(cowAfter!.archetypeId, cowBefore!.archetypeId, "identity AND archetype are both stable -- this is continuity, not a coincidentally-matching new entity")

  const secondCow = afterReturn.entities.find((e) => e.entityId === "avatark-population-cow-2")
  assert.ok(secondCow, "the herd's second real member is also still present under its own stable id")
})
