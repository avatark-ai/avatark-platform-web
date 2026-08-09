import { test } from "node:test"
import assert from "node:assert/strict"
import { applyWorldAdaptation, getWorldAdaptationEffects, wakeWorldWithAdaptation } from "./hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

const FIXED_NOW = () => "2026-08-09T00:00:00.000Z"

test("wakeWorldWithAdaptation: composes Sprint 14's own encounter-realization wake, unmodified -- the first organic wake's realized encounters produce real adaptation signals, but a single wake never crosses any rule's own bounded threshold", async () => {
  const worldInstanceId = "world-adaptation-host-test-first-wake"
  const result = await wakeWorldWithAdaptation(worldInstanceId, "owner-1", FIXED_NOW)
  await releaseLease(worldInstanceId, "owner-1")

  assert.ok(result.realization.encounterRecords.some((r) => r.status === "CONSEQUENCES_APPLIED"), "Sprint 14's own realization pass is untouched and still realizes the seeded convergences")
  assert.ok(result.adaptation.signals.length > 0, "the freshly realized encounters produced real adaptation signals")
  assert.equal(result.adaptation.effects.length, 0, "one wake's worth of encounters alone never crosses any rule's own bounded threshold -- see docs/SPRINT15_FINAL_REPORT.md")

  const effects = await getWorldAdaptationEffects(worldInstanceId)
  assert.deepEqual(effects, [], "nothing has been persisted as an effect yet, only pressure")
})

test("wakeWorldWithAdaptation: replaying the identical wake (same later instant) produces zero additional signals/pressure changes -- idempotent, matching Sprint 14's own replay posture", async () => {
  const worldInstanceId = "world-adaptation-host-test-replay"
  const seedTick = () => "2026-08-09T00:00:00.000Z"
  const advancedTick = () => "2026-08-09T00:00:00.001Z"

  await wakeWorldWithAdaptation(worldInstanceId, "owner-1", seedTick)
  await releaseLease(worldInstanceId, "owner-1")
  const advanced = await wakeWorldWithAdaptation(worldInstanceId, "owner-1", advancedTick)
  await releaseLease(worldInstanceId, "owner-1")

  const replayed = await wakeWorldWithAdaptation(worldInstanceId, "owner-1", advancedTick)
  await releaseLease(worldInstanceId, "owner-1")

  // The replayed wake recomputes the SAME already-CONSEQUENCES_APPLIED
  // records at the SAME completionTick, so `deriveAdaptationSignals`
  // harmlessly regenerates the same signals a second time -- but
  // `runWorldAdaptation`'s own replay guard (existing pressure's
  // `lastUpdatedTick` already >= this tick) means NOT ONE of them
  // produces a new pressure/decision/effect. This is the real
  // idempotency guarantee, not "zero signals" (see
  // docs/SPRINT15_FINAL_REPORT.md's replay/idempotency section).
  assert.deepEqual(replayed.adaptation.pressures, [], "zero pressure updates on replay -- the guard skipped every subject whose pressure was already advanced to this exact tick")
  assert.deepEqual(replayed.adaptation.effects, [], "zero effects on replay -- nothing was re-applied")
  assert.deepEqual(advanced.realization.encounterRecords, replayed.realization.encounterRecords, "Sprint 14's own replay guarantee still holds underneath")
})

test("applyWorldAdaptation: zero realized encounters and zero resource readings produce zero signals/pressures/effects -- never a spurious tick", async () => {
  const result = await applyWorldAdaptation({ worldId: "world-adaptation-empty-input-test", tick: 1, realizedEncounters: [], resourceReadings: [] })
  assert.deepEqual(result, { worldId: "world-adaptation-empty-input-test", tick: 1, signals: [], pressures: [], decisions: [], effects: [] })
})
