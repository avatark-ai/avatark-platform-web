import assert from "node:assert/strict"
import { test } from "node:test"
import type { AdaptationDomain } from "./domain.ts"
import type { AdaptationSignalKind } from "./signal.ts"
import type { EntityAdaptationEffectKind, RelationshipAdaptationEffectKind, PlaceAdaptationEffectKind, GroupAdaptationEffectKind, WorldPossibilityAdaptationEffectKind, AdaptationEffect } from "./effect.ts"

const ALL_DOMAINS: AdaptationDomain[] = ["ENTITY", "RELATIONSHIP", "PLACE", "GROUP", "WORLD_POSSIBILITY"]
const ALL_SIGNAL_KINDS: AdaptationSignalKind[] = ["ENCOUNTER_INVOLVEMENT", "ENCOUNTER_EVIDENCE", "RESOURCE_SCARCITY", "RESOURCE_ABUNDANCE"]
const ALL_ENTITY_EFFECT_KINDS: EntityAdaptationEffectKind[] = ["ROUTINE_PREFERENCE", "RESOURCE_PREFERENCE_BIAS", "LOCATION_PREFERENCE", "SOCIAL_AFFINITY", "SOCIAL_AVOIDANCE", "GROUP_PARTICIPATION_BIAS"]
const ALL_RELATIONSHIP_EFFECT_KINDS: RelationshipAdaptationEffectKind[] = ["AFFINITY_BIAS", "INTERACTION_LIKELIHOOD_BIAS"]
const ALL_PLACE_EFFECT_KINDS: PlaceAdaptationEffectKind[] = ["HABITUAL_OCCUPANCY", "USE_PRESSURE", "RESOURCE_PRESSURE", "SOCIAL_SIGNIFICANCE", "ENCOUNTER_ELIGIBILITY"]
const ALL_GROUP_EFFECT_KINDS: GroupAdaptationEffectKind[] = ["COHESION_BIAS", "GROUP_ROUTINE_PREFERENCE", "MOVEMENT_TENDENCY"]
const ALL_WORLD_POSSIBILITY_EFFECT_KINDS: WorldPossibilityAdaptationEffectKind[] = ["ENCOUNTER_WEIGHT_BIAS", "RESOURCE_AVAILABILITY_CONSEQUENCE", "ROUTINE_SELECTION_BIAS"]

test("AdaptationDomain is a fixed, exhaustively enumerable closed union -- no duplicate/typo'd value", () => {
  assert.equal(new Set(ALL_DOMAINS).size, ALL_DOMAINS.length)
})

test("AdaptationSignalKind is a fixed, exhaustively enumerable closed union", () => {
  assert.equal(new Set(ALL_SIGNAL_KINDS).size, ALL_SIGNAL_KINDS.length)
})

test("every per-domain AdaptationEffect kind vocabulary is closed and non-overlapping across domains", () => {
  const all = [...ALL_ENTITY_EFFECT_KINDS, ...ALL_RELATIONSHIP_EFFECT_KINDS, ...ALL_PLACE_EFFECT_KINDS, ...ALL_GROUP_EFFECT_KINDS, ...ALL_WORLD_POSSIBILITY_EFFECT_KINDS]
  assert.equal(new Set(all).size, all.length, "no effect kind string may be reused across two different domains -- that would make the kind alone ambiguous without the domain tag")
})

test("AdaptationEffect is a closed, tagged union addressable by an existing id type per domain -- never a generic mutable property bag", () => {
  const entity: AdaptationEffect = { id: "e1", worldId: "w1", ruleId: "r1", tier: 1, appliedTick: 10, reversible: true, causalReferences: [], domain: "ENTITY", entityId: "cow-1", kind: "RESOURCE_PREFERENCE_BIAS" }
  const relationship: AdaptationEffect = { id: "e2", worldId: "w1", ruleId: "r2", tier: 1, appliedTick: 10, reversible: true, causalReferences: [], domain: "RELATIONSHIP", relationshipId: "rel-1", kind: "INTERACTION_LIKELIHOOD_BIAS" }
  const place: AdaptationEffect = { id: "e3", worldId: "w1", ruleId: "r3", tier: 1, appliedTick: 10, reversible: false, causalReferences: [], domain: "PLACE", locationId: "loc-1", kind: "ENCOUNTER_ELIGIBILITY" }
  const group: AdaptationEffect = { id: "e4", worldId: "w1", ruleId: "r4", tier: 1, appliedTick: 10, reversible: true, causalReferences: [], domain: "GROUP", groupId: "g1", kind: "COHESION_BIAS" }
  const worldPossibility: AdaptationEffect = { id: "e5", worldId: "w1", ruleId: "r5", tier: 1, appliedTick: 10, reversible: true, causalReferences: [], domain: "WORLD_POSSIBILITY", subjectId: "rule-1", kind: "ENCOUNTER_WEIGHT_BIAS" }

  for (const effect of [entity, relationship, place, group, worldPossibility]) {
    assert.equal(typeof effect.id, "string")
    assert.equal(typeof effect.tier, "number")
  }
})
