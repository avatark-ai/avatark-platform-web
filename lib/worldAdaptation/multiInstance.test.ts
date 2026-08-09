import { test } from "node:test"
import assert from "node:assert/strict"
import { applyWorldAdaptation, getWorldAdaptationEffects, wakeWorldWithAdaptation } from "./hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

async function releaseLease(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

// Sprint 15: the same multi-instance isolation property every prior
// sprint's own Host layer already proves, reproven here --
// adaptationPressureRepository/adaptationEffectRepository are keyed by
// worldId throughout, by construction (see
// packages/world-adaptation-runtime/src/inMemoryRepositories.ts).
test("two world instances accumulate adaptation pressure for the IDENTICAL subject id with zero bleed between them", async () => {
  const worldA = "world-adaptation-multi-instance-a"
  const worldB = "world-adaptation-multi-instance-b"
  const entityId = "avatark-population-cow-1" // deliberately the SAME entity id in both instances

  const encounter = (worldId: string, tick: number) => ({ worldId, tick, realizedEncounters: [{ ruleId: "yamuna-flowering-reflection", locationId: "yamuna", participantEntityIds: [entityId], relationshipIdsInvolved: [], tick, causalReferences: [] }], resourceReadings: [] })

  // Instance A crosses the ENTITY rule's own threshold (several
  // encounters); instance B receives only a single one.
  let resultA
  for (let tick = 1; tick <= 8; tick++) {
    resultA = await applyWorldAdaptation(encounter(worldA, tick))
    if (resultA.effects.length > 0) break
  }
  const resultB = await applyWorldAdaptation(encounter(worldB, 1))

  assert.ok(resultA!.effects.length > 0, "instance A's own repeated history crossed the threshold")
  assert.equal(resultB.effects.length, 0, "instance B's own single encounter did not -- its pressure was never inflated by instance A's identical subject id")

  const effectsA = await getWorldAdaptationEffects(worldA)
  const effectsB = await getWorldAdaptationEffects(worldB)
  assert.ok(effectsA.length > 0)
  assert.deepEqual(effectsB, [], "instance B's own effect list stays empty despite sharing the exact same entity/rule/location ids as instance A")
})

test("two organic Vrindavan world instances woken through wakeWorldWithAdaptation produce adaptation results scoped to their own worldId, never the sibling's", async () => {
  const instanceA = "world-adaptation-multi-instance-organic-a"
  const instanceB = "world-adaptation-multi-instance-organic-b"

  const resultA = await wakeWorldWithAdaptation(instanceA, "owner-a", () => "2026-08-09T00:00:00.000Z")
  await releaseLease(instanceA, "owner-a")
  const resultB = await wakeWorldWithAdaptation(instanceB, "owner-b", () => "2026-08-09T00:00:00.000Z")
  await releaseLease(instanceB, "owner-b")

  assert.equal(resultA.adaptation.worldId, instanceA)
  assert.equal(resultB.adaptation.worldId, instanceB)
  assert.ok(resultA.adaptation.signals.length > 0 && resultB.adaptation.signals.length > 0, "both instances independently derive their own real adaptation signals from their own first wake")
})
