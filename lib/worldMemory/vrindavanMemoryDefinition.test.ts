import { test } from "node:test"
import assert from "node:assert/strict"
import { createWorldInstance } from "../livingWorldHost/hostService.ts"
import { getEmergentEncounterOpportunities } from "./hostService.ts"
import { worldEventRepository } from "./singleton.ts"
import { VRINDAVAN_EMERGENT_ENCOUNTER_RULES } from "./vrindavanMemoryDefinition.ts"
import { wakeWorld, advanceWorld } from "../worldPersistence/hostService.ts"
import { worldLeaseRepository } from "../worldPersistence/singleton.ts"

async function releaseIfHeld(worldInstanceId: string, ownerId: string) {
  const current = await worldLeaseRepository.getCurrent(worldInstanceId)
  if (current && current.ownerId === ownerId) await worldLeaseRepository.release(worldInstanceId, ownerId, current.leaseVersion)
}

const SEED_NOW = () => "2026-08-09T00:00:00.000Z"

test("Build 03, req 17: exactly one Yamuna emergent rule exists, additive to Kadamba Grove's own two -- Yamuna had zero before this build, a real, named gap this build closes", () => {
  const yamunaRules = VRINDAVAN_EMERGENT_ENCOUNTER_RULES.filter((r) => r.requiresLocationId === "yamuna")
  const groveRules = VRINDAVAN_EMERGENT_ENCOUNTER_RULES.filter((r) => r.requiresLocationId === "kadamba-grove")
  assert.equal(yamunaRules.length, 1)
  assert.equal(yamunaRules[0].ruleId, "avatark-population-recent-watering-yamuna")
  assert.equal(yamunaRules[0].requiresEventCategory, "POPULATION_MOVEMENT")
  assert.equal(groveRules.length, 2, "the two real, pre-existing Kadamba Grove rules are unchanged")
})

// Real seeded population (both cows at yamuna, tick 0, before any wake
// migrates them), the real Host-composed `getEmergentEncounterOpportunities`
// function, and the REAL worldEventRepository singleton -- the one
// constructed input is the WorldEvent itself, standing in for "a
// population arrival at Yamuna already happened recently," the same
// class of precondition-setup Sprint 11's own hostService-level tests
// already use elsewhere, and matching this exact rule's own sibling
// (`avatark-population-recent-arrival-kadamba-grove`)'s already-real,
// already-proven shape. See docs/LIVING_VRINDAVAN_BUILD_03_FINAL_REPORT.md's
// own honest finding on why this build's real end-to-end wake sequence
// does not organically reproduce a SECOND group-level relocation back
// to Yamuna within a normal wake horizon -- this test instead proves
// the RULE ITSELF is correctly wired to real Vrindavan content and the
// real engine, independent of that separate, honestly-named gap.
test("Build 03: the real Yamuna emergent rule surfaces a live opportunity once a real, recent POPULATION_MOVEMENT event at yamuna exists and real population is genuinely present there", async () => {
  const worldInstanceId = "living-vrindavan-build-03-yamuna-emergent-rule"
  const owner = "yamuna-rule-test-owner"
  await createWorldInstance(worldInstanceId, SEED_NOW)

  // Persistence-layer-only tick advance (Build 02's own established
  // pattern) -- bumps the real, durable world clock to tick 1 WITHOUT
  // running the population/rhythm wake chain, so the herd stays exactly
  // where it was seeded (yamuna). `worldEventRepository.listSince`'s own
  // real, strict `tick > sinceTick(0)` filter (packages/world-memory-runtime)
  // means a tick-0 event is structurally invisible to this query; a
  // real tick-1 world clock is required for a tick-1 event to ever be
  // seen, matching every other real WorldEvent this codebase ever
  // produces (none is ever recorded at tick 0 for exactly this reason).
  await wakeWorld(worldInstanceId, owner, SEED_NOW)
  await advanceWorld(worldInstanceId, 1, owner, SEED_NOW)
  await releaseIfHeld(worldInstanceId, owner)

  await worldEventRepository.append({
    id: "test-population-movement-yamuna-1",
    worldId: worldInstanceId,
    tick: 1,
    category: "POPULATION_MOVEMENT",
    locationId: "yamuna",
    participantEntityIds: ["avatark-population-cow-1", "avatark-population-cow-2"],
    causalReferences: [],
    consequences: [],
    significance: "MEANINGFUL",
    retentionTier: "RECENT",
    provenance: { derivedFromEventIds: [], derivationRule: "test-fixture", causalReferences: [] },
    occurredAt: SEED_NOW(),
  })

  const opportunities = await getEmergentEncounterOpportunities(worldInstanceId, SEED_NOW)
  const yamunaOpportunity = opportunities.find((o) => o.ruleId === "avatark-population-recent-watering-yamuna")

  assert.ok(yamunaOpportunity, "the real seeded cows are genuinely present at yamuna at tick 0 (before any wake relocates them), and the injected recent arrival event is real and within the rule's own 10-tick window -- the rule correctly surfaces")
  assert.deepEqual(yamunaOpportunity!.contributingEntityIds.sort(), ["avatark-population-cow-1", "avatark-population-cow-2"])
})

test("Build 03: the real Yamuna emergent rule does NOT surface without a qualifying recent event, even with real population genuinely present -- no false positive", async () => {
  const worldInstanceId = "living-vrindavan-build-03-yamuna-emergent-rule-absent"
  await createWorldInstance(worldInstanceId, SEED_NOW)

  const opportunities = await getEmergentEncounterOpportunities(worldInstanceId, SEED_NOW)
  const yamunaOpportunity = opportunities.find((o) => o.ruleId === "avatark-population-recent-watering-yamuna")
  assert.equal(yamunaOpportunity, undefined, "zero WorldEvents exist yet for a freshly-created instance -- an honest absence, not a fabricated opportunity")
})
