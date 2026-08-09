import { test } from "node:test"
import assert from "node:assert/strict"
import { ensureLivingVrindavanDevInstance, LIVING_VRINDAVAN_DEV_INSTANCE_ID } from "./vrindavanDevFixture.ts"

const FIXED_NOW = () => "2026-08-09T00:00:00.000Z"

test("Living Vrindavan Build 01, Phase X: the named dev instance provisions deterministically and is idempotent to re-provision", async () => {
  assert.equal(LIVING_VRINDAVAN_DEV_INSTANCE_ID, "living-vrindavan-dev-001")

  const first = await ensureLivingVrindavanDevInstance(FIXED_NOW)
  assert.equal(first.sharedState.clock.tick, 0)
  assert.equal(first.sharedState.season.currentSeasonId, "vasanta")

  const second = await ensureLivingVrindavanDevInstance(FIXED_NOW)
  assert.deepEqual(second, first, "re-provisioning the same dev instance id is a real, deterministic no-op, never a second world")
})
