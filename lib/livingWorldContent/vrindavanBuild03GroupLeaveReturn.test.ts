import { test } from "node:test"
import assert from "node:assert/strict"
import { createWorldInstance, wakeLivingWorld } from "../livingWorldHost/hostService.ts"
import { wakeWorldWithCanonicalEvents } from "../canonicalEvents/hostService.ts"
import { getWorldState } from "../worldPersistence/hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"
import { groupStateRepository } from "../livingPopulation/singleton.ts"
import { homeRangeRepository } from "../socialEcology/singleton.ts"
import { projectVrindavanPresentation } from "../livingWorldEmbodiment/vrindavanPresentationProjection.ts"

async function releaseIfHeld(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current && current.ownerId === ownerId) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

const SEED_NOW = () => "2026-08-09T00:00:00.000Z"

// Living Vrindavan Build 03: leave -> world continues independently ->
// return, proven for a real, persistent GROUP (the cow herd), not only
// a single entity -- Build 02's own flagship leave/return proof already
// established this for one entity (`avatark-population-cow-1`); this
// test extends the SAME real mechanism to `GroupState`/`HomeRange`
// continuity specifically, since a group is its own distinct persisted
// record (Sprint 10/12), not merely a derived label over its members.
test("Build 03: the real cow herd's own GroupState and HomeRange survive a real visitor absence with the same identity, membership, and home range -- world evolves independently, not scripted", async () => {
  const worldInstanceId = "living-vrindavan-build-03-group-leave-return"
  const ownerA = "build03-group-leave-return-owner-a"

  await createWorldInstance(worldInstanceId, SEED_NOW)
  const wake1 = await wakeWorldWithCanonicalEvents(worldInstanceId, ownerA, SEED_NOW)
  await releaseIfHeld(worldInstanceId, ownerA)

  const herdBefore = (await groupStateRepository.list(worldInstanceId)).find((g) => g.id === "avatark-population-cow-herd")
  assert.ok(herdBefore, "the real, seeded cow herd GroupState exists before any absence")
  assert.deepEqual(herdBefore!.memberEntityIds.sort(), ["avatark-population-cow-1", "avatark-population-cow-2"])
  assert.equal(herdBefore!.cohesion, 1, "both real members are co-located at the herd's own seed location before any absence")

  const homeRangeBefore = await homeRangeRepository.get(worldInstanceId, "GROUP", "avatark-population-cow-herd")
  assert.ok(homeRangeBefore, "the real, seeded HomeRange for the herd exists")
  assert.deepEqual(homeRangeBefore!.preferredLocationIds, ["yamuna"], "the herd's own real home range is Yamuna, its own seed location -- unaffected by anything that happens to it later")

  const tickBefore = wake1.spatial.adaptation.realization.rhythms.social.memory.world.state.sharedState.clock.tick

  // "Leave": nothing durable is mutated by leaving itself (Build 01/02's
  // own reconfirmed finding) -- the world is left to run on its own,
  // woken later by a SEPARATE owner, never the visitor's own leave call.
  // A real ~20-real-minute absence -- Build 01/02's own established
  // safe magnitude (well short of the real OOM-crash magnitude Build 01
  // documented at ~2 real hours).
  const returnNow = () => "2026-08-09T00:20:00.000Z"
  const ownerB = "build03-group-leave-return-owner-b"
  const wake = await wakeLivingWorld(worldInstanceId, ownerB, returnNow)
  assert.equal(wake.woke, true, "a real, separate owner wakes the world during the visitor's absence, exactly like Build 01/02's own flagship proof")
  await releaseIfHeld(worldInstanceId, ownerB)

  const herdAfter = (await groupStateRepository.list(worldInstanceId)).find((g) => g.id === "avatark-population-cow-herd")
  assert.ok(herdAfter, "the SAME real GroupState id is still present after the absence -- not regenerated as a new group")
  assert.deepEqual(herdAfter!.memberEntityIds.sort(), herdBefore!.memberEntityIds.sort(), "the SAME two real members, no membership drift")
  assert.ok(herdAfter!.lastUpdatedTick > herdBefore!.lastUpdatedTick, "the herd's own record genuinely advanced with real elapsed ticks -- not frozen")

  const homeRangeAfter = await homeRangeRepository.get(worldInstanceId, "GROUP", "avatark-population-cow-herd")
  assert.deepEqual(homeRangeAfter!.preferredLocationIds, ["yamuna"], "the herd's own real home range is unaffected by the absence -- Sprint 12's own real invariant, reconfirmed for Build 03's own content")

  const afterState = await getWorldState(worldInstanceId, returnNow)
  const tickAfter = afterState.sharedState.clock.tick
  assert.ok(tickAfter > tickBefore, "real elapsed wall-clock time produced real, durably-applied elapsed ticks -- the world genuinely continued independently, not scripted")

  // Renderer-neutral presentation projection (Build 02) reconfirms the
  // SAME real herd member is reachable through it after the absence.
  const presentation = await projectVrindavanPresentation(worldInstanceId, "build03-group-leave-return-visitor", herdAfter!.locationId, ["vrindavan-entry", "yamuna", "kadamba-grove", "govardhan-path"].filter((l) => l !== herdAfter!.locationId), null, returnNow)
  const cowInPresentation = [presentation.current, ...presentation.reachable].flatMap((r) => r.entities).find((e) => e.entityId === "avatark-population-cow-1")
  assert.ok(cowInPresentation, "the same real herd member is reachable through the presentation layer after the absence, with its own stable identity intact")
})
