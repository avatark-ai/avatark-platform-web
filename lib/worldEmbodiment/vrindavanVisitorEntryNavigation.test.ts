import { test } from "node:test"
import assert from "node:assert/strict"
import { createWorldRuntime, InMemoryWorldStateRepository } from "@avatark/living-world-runtime"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { dispatchInteractionIntent } from "./intentDispatcher.ts"
import { getWorldSnapshotForVisitor } from "../livingWorldHost/hostService.ts"
import type { RuntimeKernel } from "../runtimeKernel/orchestrator.ts"

function freshKernel(): RuntimeKernel {
  return { livingWorld: createWorldRuntime({ definitions: [LIVING_VRINDAVAN_DEFINITION], repository: new InMemoryWorldStateRepository() }) }
}

// Living Vrindavan Build 01, Phases Q (Visitor Entry) and R (Visitor
// Navigation). Uses the real, production-shaped `dispatchInteractionIntent`
// path (Sprint 8/19) -- the SAME entry point `/api/account/living-worlds`
// already calls -- never a client-only shortcut. `enterLivingWorld`/
// `visitLivingWorldLocation` remain on `@avatark/living-world-runtime`'s
// own WorldRuntime (Sprint 19's own finding, reconfirmed: a distinct,
// legitimate per-visitor-progression concern, not shared-world truth).

test("Living Vrindavan Build 01, Phase Q: a visitor entering the world lands at the real, Approved entry location", async () => {
  const kernel = freshKernel()
  const result = await dispatchInteractionIntent({ type: "enter-world", userId: "build01-visitor-q1", worldId: "living-vrindavan" }, kernel)
  assert.equal(result.ok, true)
  const state = await kernel.livingWorld!.getState("build01-visitor-q1", "living-vrindavan")
  assert.equal(state?.currentLocationId, "vrindavan-entry", "the entry location is STK-CAN-001's own Approved `vrindavan-entry`, never an invented threshold")
})

test("Living Vrindavan Build 01, Phase Q: the authoritative snapshot returned to a visitor reflects REAL, live world state -- not static fixture text", async () => {
  const worldInstanceId = "living-vrindavan-build-01-q-real-state"
  const earlyTick = () => "2026-08-09T00:00:00.000Z"
  const laterTick = () => "2026-08-09T00:00:10.000Z" // +10s real elapsed -> +10 ticks at this environment's own 1-tick-per-ms reference rate against a wake, but a pure read never advances by itself -- see below

  const first = await getWorldSnapshotForVisitor({ worldInstanceId, ownerId: "q-real-state-owner", userId: "build01-visitor-q2", locationId: "vrindavan-entry", now: earlyTick })
  // getWorldSnapshotForVisitor's own best-effort wake DOES advance the
  // durable world on this real read (Sprint 20's own singleton->durable
  // convergence finding: "genuinely advances... a net improvement, not
  // a regression"). A second read at a later real timestamp therefore
  // returns a snapshot from a LATER simulation tick -- real, live state,
  // not a cached or hardcoded fixture.
  const second = await getWorldSnapshotForVisitor({ worldInstanceId, ownerId: "q-real-state-owner", userId: "build01-visitor-q2", locationId: "vrindavan-entry", now: laterTick })

  assert.notEqual(second.snapshot.simulationTick, first.snapshot.simulationTick, "two reads separated by real elapsed time return snapshots from two different, real simulation ticks")
  assert.ok(second.snapshot.simulationTick > first.snapshot.simulationTick)
})

test("Living Vrindavan Build 01, Phase R: a visitor can navigate the real Approved graph, entry -> yamuna -> kadamba-grove, and world state actually changes each step", async () => {
  const kernel = freshKernel()
  await dispatchInteractionIntent({ type: "enter-world", userId: "build01-visitor-r1", worldId: "living-vrindavan" }, kernel)

  const toYamuna = await dispatchInteractionIntent({ type: "visit-location", userId: "build01-visitor-r1", worldId: "living-vrindavan", locationId: "yamuna" }, kernel)
  assert.equal(toYamuna.ok, true)
  assert.equal((await kernel.livingWorld!.getState("build01-visitor-r1", "living-vrindavan"))?.currentLocationId, "yamuna")

  const toGrove = await dispatchInteractionIntent({ type: "visit-location", userId: "build01-visitor-r1", worldId: "living-vrindavan", locationId: "kadamba-grove" }, kernel)
  assert.equal(toGrove.ok, true, "yamuna -> kadamba-grove is a real edge in STK-SPEC-002's own connections[]")
  assert.equal((await kernel.livingWorld!.getState("build01-visitor-r1", "living-vrindavan"))?.currentLocationId, "kadamba-grove")
})

test("Living Vrindavan Build 01, Phase R: an illegal transition (entry directly to kadamba-grove, no such edge) is rejected by the real authoritative graph, not a new ad hoc check", async () => {
  const kernel = freshKernel()
  await dispatchInteractionIntent({ type: "enter-world", userId: "build01-visitor-r2", worldId: "living-vrindavan" }, kernel)

  const illegal = await dispatchInteractionIntent({ type: "visit-location", userId: "build01-visitor-r2", worldId: "living-vrindavan", locationId: "kadamba-grove" }, kernel)
  assert.equal(illegal.ok, false, "vrindavan-entry -> kadamba-grove has no direct connection in STK-SPEC-002's own real graph -- entry only connects to yamuna")

  // Two spatially-close-but-unconnected patches must not be teleportable
  // between (Phase F's own explicit requirement) -- the visitor's real
  // location is unchanged after the rejected attempt, proving the
  // rejection happened before any state mutation, not after a partial one.
  const state = await kernel.livingWorld!.getState("build01-visitor-r2", "living-vrindavan")
  assert.equal(state?.currentLocationId, "vrindavan-entry")
})

test("Living Vrindavan Build 01, Phase R: govardhan-path is reachable only via yamuna, matching the real Approved connection graph exactly", async () => {
  const kernel = freshKernel()
  await dispatchInteractionIntent({ type: "enter-world", userId: "build01-visitor-r3", worldId: "living-vrindavan" }, kernel)

  const direct = await dispatchInteractionIntent({ type: "visit-location", userId: "build01-visitor-r3", worldId: "living-vrindavan", locationId: "govardhan-path" }, kernel)
  assert.equal(direct.ok, false, "entry -> govardhan-path has no direct edge")

  await dispatchInteractionIntent({ type: "visit-location", userId: "build01-visitor-r3", worldId: "living-vrindavan", locationId: "yamuna" }, kernel)
  const viaYamuna = await dispatchInteractionIntent({ type: "visit-location", userId: "build01-visitor-r3", worldId: "living-vrindavan", locationId: "govardhan-path" }, kernel)
  assert.equal(viaYamuna.ok, true, "yamuna -> govardhan-path is a real edge")
})
