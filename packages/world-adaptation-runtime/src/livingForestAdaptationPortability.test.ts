import assert from "node:assert/strict"
import { test } from "node:test"
import type { AdaptationRule } from "@avatark/world-adaptation-contracts"
import { deriveAdaptationSignals } from "./adaptationSignals.ts"
import { runWorldAdaptation } from "./worldAdaptation.ts"

// Sprint 15, mission's own "WORLD NEUTRALITY" section: the exact same
// `deriveAdaptationSignals`/`runWorldAdaptation` functions Vrindavan's
// own Host layer calls (lib/worldAdaptation/hostService.ts), run
// against a wholly fictional, non-Vrindavan world grammar -- a deer
// herd and a forest clearing, the same fictional fixture
// @avatark/living-population-runtime's own
// livingForestPopulationPortability.test.ts and every sibling sprint's
// own "livingForest*Portability" test already established. Rules are
// DATA supplied by this test, never a branch inside the engine -- proof
// that a wholly different Living World can bring its own adaptation
// rule set without touching this package.
const LIVING_FOREST_ADAPTATION_RULES: AdaptationRule[] = [
  {
    id: "living-forest-deer-repeated-clearing-visit-resource-bias",
    domain: "ENTITY",
    signalKind: "ENCOUNTER_INVOLVEMENT",
    threshold: 2,
    decayPerTick: 0,
    reversible: true,
    effect: { domain: "ENTITY", kind: "RESOURCE_PREFERENCE_BIAS", magnitude: 1 },
    description: "A deer that has repeatedly realized an encounter at the forest clearing develops a bounded resource preference for it.",
  },
  {
    id: "living-forest-clearing-repeated-use-significance",
    domain: "PLACE",
    signalKind: "ENCOUNTER_INVOLVEMENT",
    threshold: 2,
    decayPerTick: 0,
    reversible: false,
    effect: { domain: "PLACE", kind: "SOCIAL_SIGNIFICANCE", magnitude: 1 },
    description: "A clearing that has repeatedly hosted a realized encounter becomes a habitually significant place.",
  },
]

test("Living Forest fixture: repeated deer-herd encounters at the same clearing cross the same generic engine's threshold and produce ENTITY + PLACE effects -- zero Vrindavan-specific code path involved", () => {
  let existingPressures: Awaited<ReturnType<typeof runWorldAdaptation>>["pressures"] = []
  let lastResult: ReturnType<typeof runWorldAdaptation> | null = null

  for (const tick of [5, 15]) {
    const signals = deriveAdaptationSignals({
      realizedEncounters: [{ ruleId: "living-forest-clearing-gathering", locationId: "forest-clearing", participantEntityIds: ["deer-1"], relationshipIdsInvolved: [], tick, causalReferences: [] }],
      resourceReadings: [],
    })
    lastResult = runWorldAdaptation({ worldId: "living-forest-world", tick, signals, rules: LIVING_FOREST_ADAPTATION_RULES, existingPressures })
    existingPressures = [...existingPressures.filter((p) => !lastResult!.pressures.some((next) => next.domain === p.domain && next.subjectId === p.subjectId && next.kind === p.kind)), ...lastResult.pressures]
  }

  const entityEffect = lastResult!.effects.find((e) => e.domain === "ENTITY")
  const placeEffect = lastResult!.effects.find((e) => e.domain === "PLACE")
  assert.ok(entityEffect, "expected a triggered ENTITY effect for deer-1 after two realized encounters at the clearing")
  assert.equal(entityEffect && "entityId" in entityEffect ? entityEffect.entityId : undefined, "deer-1")
  assert.ok(placeEffect, "expected a triggered PLACE effect for forest-clearing after two realized encounters there")
  assert.equal(placeEffect && "locationId" in placeEffect ? placeEffect.locationId : undefined, "forest-clearing")
})

test("Living Forest fixture: a single realized encounter alone does not cross either rule's threshold -- bounded accumulation holds for any world grammar, not just Vrindavan", () => {
  const signals = deriveAdaptationSignals({ realizedEncounters: [{ ruleId: "living-forest-clearing-gathering", locationId: "forest-clearing", participantEntityIds: ["deer-1"], relationshipIdsInvolved: [], tick: 5, causalReferences: [] }], resourceReadings: [] })
  const result = runWorldAdaptation({ worldId: "living-forest-world", tick: 5, signals, rules: LIVING_FOREST_ADAPTATION_RULES, existingPressures: [] })
  assert.equal(result.effects.length, 0)
})
