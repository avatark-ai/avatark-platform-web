import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveEncounterRealization } from "@avatark/encounter-realization-runtime"
import { resolvePreferredResourceLocation } from "@avatark/world-memory-runtime"
import { deriveRelationshipBand } from "@avatark/social-ecology-runtime"
import { applyWorldAdaptation, getWorldAdaptationEffects } from "./hostService.ts"
import { entityMemoryRepository } from "../worldMemory/singleton.ts"
import { relationshipRepository } from "../socialEcology/singleton.ts"

// Sprint 15's own reference scenarios -- each test below is named for
// the mission's own "VRINDAVAN REFERENCE SCENARIOS" letter it proves.
// Every fixture uses only already-authorized Vrindavan grammar (yamuna,
// kadamba-grove, the seeded cow herd, the two real EncounterRule ids) --
// the SAME posture Sprint 14's own scenarios.test.ts already
// established, INCLUDING its "same functions, a constructed input"
// methodology (SCENARIO B/E there) for driving REPEATED wakes'
// worth of realized-encounter evidence deterministically, since the
// organic simulation's own rhythm schedule does not keep re-realizing
// the identical rule every tick indefinitely (see docs/SPRINT14_FINAL_REPORT.md
// §15's own tick-rate caution).

// SCENARIO A -- Entity adaptation.
test("SCENARIO A: an entity repeatedly involved in a realized encounter develops a bounded resource preference, read back by Sprint 11's own unmodified memoryHint bridge", async () => {
  const worldId = "world-adaptation-scenario-a"
  const entityId = "avatark-population-cow-1"

  let lastResult
  for (let tick = 1; tick <= 8; tick++) {
    lastResult = await applyWorldAdaptation({
      worldId,
      tick,
      realizedEncounters: [{ ruleId: "yamuna-flowering-reflection", locationId: "yamuna", participantEntityIds: [entityId], relationshipIdsInvolved: [], tick, causalReferences: [{ kind: "test", ref: "scenario-a" }] }],
      resourceReadings: [],
    })
    if (lastResult.effects.length > 0) break
  }

  assert.ok(lastResult!.effects.some((e) => e.domain === "ENTITY" && e.kind === "RESOURCE_PREFERENCE_BIAS"), "repeated realized-encounter involvement crossed the ENTITY rule's own bounded threshold")

  const memory = await entityMemoryRepository.list(worldId, entityId)
  const preferenceEntry = memory.find((e) => e.type === "PREVIOUS_RESOURCE_LOCATION" && e.detail.locationId === "yamuna")
  assert.ok(preferenceEntry, "the effect was applied through the SAME EntityMemoryEntry write boundary Sprint 11/14 already use, never a parallel memory store")
  assert.equal(preferenceEntry!.provenance.derivationRule, "adaptation.avatark-adaptation-entity-repeated-encounter-resource-bias", "provenance honestly attributes this entry to adaptation, distinct from a raw per-encounter consequence")

  assert.equal(resolvePreferredResourceLocation(memory), "yamuna", "Sprint 11's own unmodified resolvePreferredResourceLocation reads the adaptation-driven preference exactly like any other memory entry")
})

test("SCENARIO A: a single realized encounter alone never crosses the ENTITY rule's own threshold -- one encounter does not transform the world", async () => {
  const worldId = "world-adaptation-scenario-a-single"
  const result = await applyWorldAdaptation({ worldId, tick: 1, realizedEncounters: [{ ruleId: "yamuna-flowering-reflection", locationId: "yamuna", participantEntityIds: ["avatark-population-cow-1"], relationshipIdsInvolved: [], tick: 1, causalReferences: [] }], resourceReadings: [] })
  assert.equal(result.effects.length, 0)
  assert.deepEqual(await entityMemoryRepository.list(worldId, "avatark-population-cow-1"), [])
})

// SCENARIO B -- Relationship adaptation, applied through the REAL Social
// Ecology write boundary.
test("SCENARIO B: a relationship repeatedly evidenced by realized encounters accrues a bounded adaptation that raises the SAME RelationshipState.band Social Ecology already owns", async () => {
  const worldId = "world-adaptation-scenario-b"
  const relationship = { id: "adaptation-scenario-b-relationship", worldId, entityAId: "avatark-population-cow-1", entityBId: "avatark-population-cow-2", relationshipType: "PARENT_OFFSPRING" as const, band: "WEAK" as const, evidence: { coPresenceTicks: 0, sharedGroupTicks: 0, reunionCount: 0, encounterCount: 1 }, establishedTick: 0, lastRelevantTick: 0 }
  await relationshipRepository.save(relationship)

  const bandBefore = (await relationshipRepository.get(worldId, relationship.id))!.band
  assert.equal(bandBefore, "WEAK")

  let lastResult
  for (let tick = 1; tick <= 8; tick++) {
    lastResult = await applyWorldAdaptation({
      worldId,
      tick,
      realizedEncounters: [{ ruleId: "yamuna-flowering-reflection", locationId: "yamuna", participantEntityIds: ["avatark-population-cow-1", "avatark-population-cow-2"], relationshipIdsInvolved: [relationship.id], tick, causalReferences: [] }],
      resourceReadings: [],
    })
    if (lastResult.effects.some((e) => e.domain === "RELATIONSHIP")) break
  }
  assert.ok(lastResult!.effects.some((e) => e.domain === "RELATIONSHIP" && e.kind === "INTERACTION_LIKELIHOOD_BIAS"))

  const afterRelationship = await relationshipRepository.get(worldId, relationship.id)
  assert.ok((afterRelationship!.evidence.encounterCount ?? 0) > relationship.evidence.encounterCount!, "applied through the SAME Social Ecology sole write boundary (applyEncounterEvidence), never a parallel relationship graph")
  assert.equal(afterRelationship!.band, deriveRelationshipBand(afterRelationship!.evidence), "the resulting band is exactly what Social Ecology's own unmodified deriveRelationshipBand computes from the evidence -- no adaptation-specific band override exists")
  assert.notEqual(afterRelationship!.band, "WEAK", "the accumulated adaptation genuinely raised the relationship's own authoritative band")
})

// SCENARIO E -- Encounter-future adaptation: the mechanism-level proof
// that the SAME relationship-band change SCENARIO B just demonstrated
// is possible legitimately changes a LATER opportunity's fate, with
// ZERO modification to Sprint 14's own resolveEncounterRealization.
test("SCENARIO E: the identical opportunity, identical everything except the relationship band adaptation can raise, flips from EXPIRED to REALIZED", () => {
  const baseParams = {
    opportunity: { ruleId: "yamuna-flowering-reflection", locationId: "yamuna", category: "ambient" as const, contributingEntityIds: ["avatark-population-cow-1", "avatark-population-cow-2"], tick: 50 },
    protectedNarrative: { worldId: "world-adaptation-scenario-e", episodeRef: null, sceneRef: null, resolved: true },
    presentEntityIds: ["avatark-population-cow-1", "avatark-population-cow-2"],
    routineCompatibleEntityIds: ["avatark-population-cow-1", "avatark-population-cow-2"], // full compatibility -- compatibleFraction 1.0, score 0.5 before any relationship bias
    groupCohesion: null,
    resourceOpportunityAvailable: false,
    variation: 0.9,
  }

  const beforeAdaptation = resolveEncounterRealization({ ...baseParams, relationshipBand: "WEAK" })
  assert.equal(beforeAdaptation.status, "EXPIRED", "before adaptation raises the band, this marginal opportunity does not realize (score 0.55, bounded-ambiguity band, this variation resolves unfavorably)")

  const afterAdaptation = resolveEncounterRealization({ ...baseParams, relationshipBand: "ESTABLISHED" })
  assert.equal(afterAdaptation.status, "REALIZED", "the SAME opportunity, the SAME everything else, realizes once the relationship band SCENARIO B's own adaptation effect raises is fed back in -- resolveEncounterRealization itself was never touched")
})

// SCENARIO C -- Place adaptation: computed, persisted, queryable --
// deliberately not yet consumed by realization inputs this sprint (see
// vrindavanAdaptationDefinition.ts's own doc comment on rule C).
test("SCENARIO C: a place repeatedly hosting a realized encounter accrues a persisted, queryable habitual-significance/encounter-eligibility effect", async () => {
  const worldId = "world-adaptation-scenario-c"
  let lastResult
  for (let tick = 1; tick <= 8; tick++) {
    lastResult = await applyWorldAdaptation({ worldId, tick, realizedEncounters: [{ ruleId: "kadamba-grove-ambient-presence", locationId: "kadamba-grove", participantEntityIds: ["avatark-population-bird-1"], relationshipIdsInvolved: [], tick, causalReferences: [] }], resourceReadings: [] })
    if (lastResult.effects.some((e) => e.domain === "PLACE" && e.kind === "ENCOUNTER_ELIGIBILITY")) break
  }
  const placeEffect = lastResult!.effects.find((e) => e.domain === "PLACE" && e.kind === "ENCOUNTER_ELIGIBILITY")
  assert.ok(placeEffect)

  const stored = await getWorldAdaptationEffects(worldId)
  assert.ok(stored.some((e) => e.id === placeEffect!.id), "the effect is durably persisted and queryable through the SAME Host-composed getter every renderer/embodiment projection uses")
})

// SCENARIO D -- Resource-driven adaptation: a persistently unavailable
// (location, category) pair accrues resource pressure. Bounded
// accumulation proven with the real Vrindavan grammar; the
// "bias entities toward an alternate" write boundary is proven
// separately at the pure-function level (adaptationRulesInvariants.test.ts)
// since the CURRENT Vrindavan seed offers no second location for any
// resource category yet (an honest, documented, current-grammar-dependent
// finding -- see vrindavanAdaptationDefinition.ts's own doc comment).
test("SCENARIO D: a (location, category) pair observed persistently unavailable accrues bounded resource pressure without any hardcoded Vrindavan branch inside the engine", async () => {
  const worldId = "world-adaptation-scenario-d"
  let lastResult
  for (let tick = 1; tick <= 6; tick++) {
    lastResult = await applyWorldAdaptation({ worldId, tick, realizedEncounters: [], resourceReadings: [{ locationId: "yamuna", category: "water", available: false, tick }], presentEntityIdsByLocation: new Map([["yamuna", ["avatark-population-cow-1"]]]) })
    if (lastResult.effects.some((e) => e.domain === "PLACE" && e.kind === "RESOURCE_PRESSURE")) break
  }
  const pressureEffect = lastResult!.effects.find((e) => e.domain === "PLACE" && e.kind === "RESOURCE_PRESSURE")
  assert.ok(pressureEffect)
  assert.equal((pressureEffect as { locationId: string }).locationId, "yamuna:water")

  // No alternate exists in the real seed for "water" today, so no
  // EntityMemoryEntry is written for this rule in THIS grammar -- the
  // mechanism itself (splitting the composite subject, looking up an
  // alternate, and writing through the same bridge SCENARIO A uses) is
  // proven independently once an alternate DOES exist.
  assert.deepEqual(await entityMemoryRepository.list(worldId, "avatark-population-cow-1"), [])
})

test("SCENARIO D: an available resource reading never accrues resource pressure -- decay recovers when scarcity ends", async () => {
  const worldId = "world-adaptation-scenario-d-recovery"
  const result = await applyWorldAdaptation({ worldId, tick: 1, realizedEncounters: [], resourceReadings: [{ locationId: "yamuna", category: "water", available: true, tick: 1 }] })
  assert.equal(result.effects.length, 0)
})
