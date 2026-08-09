import { test } from "node:test"
import assert from "node:assert/strict"
import type { RelationshipEvidence, RelationshipState } from "@avatark/social-ecology-contracts"
import { deriveFamiliarityBand, evolveFamiliarity } from "./familiarityEvolution.ts"
import { deriveRelationshipBand, evolveRelationshipEvidence } from "./relationshipEvolution.ts"
import { evaluateSeparationTransition } from "./separationReunion.ts"
import { resolveSocialPerception } from "./socialPerception.ts"
import { resolvePlaceAttachment } from "./territory.ts"

// Sprint 12, Phase 27: the SAME fictional, non-canonical "living-forest"
// fixture Sprint 7/9/10/11 already established, run here through the
// social-ecology package's own pure functions -- familiarity/
// relationship evolution, separation/reunion detection, social
// perception, place attachment -- to prove none of it is
// Living-Vrindavan-specific. No line in this package's own src/ mentions
// "vrindavan," "cow," "yamuna," or any franchise/reference-entity name.

const WORLD_ID = "living-forest-fixture"
const DEER_PARENT = "deer-1"
const DEER_OFFSPRING = "deer-2"

test("familiarity evolves identically for a wholly fictional deer pair -- co-presence in a forest clearing accumulates the same evidence Vrindavan's own cows would", () => {
  const first = evolveFamiliarity(WORLD_ID, DEER_PARENT, DEER_OFFSPRING, null, true, false, 1)
  assert.equal(first.band, "SEEN")
  const evolved = evolveFamiliarity(WORLD_ID, DEER_PARENT, DEER_OFFSPRING, first, true, false, 2)
  assert.deepEqual(evolved.evidence, { coPresenceTicks: 2, sharedGroupTicks: 0, encounterCount: 0 })
  assert.equal(deriveFamiliarityBand(evolved.evidence), "SEEN")
})

test("a PARENT_OFFSPRING relationship between two deer accumulates evidence and bands identically to any other fixture", () => {
  const relationship: RelationshipState = {
    id: "forest-deer-parent-offspring",
    worldId: WORLD_ID,
    entityAId: DEER_PARENT,
    entityBId: DEER_OFFSPRING,
    relationshipType: "PARENT_OFFSPRING",
    band: "WEAK",
    evidence: { coPresenceTicks: 0, sharedGroupTicks: 0, reunionCount: 0 },
    establishedTick: 0,
    lastRelevantTick: -1,
  }
  const evidence: RelationshipEvidence = evolveRelationshipEvidence(relationship.evidence, true, true, false)
  assert.deepEqual(evidence, { coPresenceTicks: 1, sharedGroupTicks: 1, reunionCount: 0 })
  assert.equal(deriveRelationshipBand(evidence), "WEAK")
})

test("separation/reunion between two deer is detected through the identical state-transition mechanism, zero forest-specific branching", () => {
  const separated = evaluateSeparationTransition({
    worldId: WORLD_ID,
    subjectType: "RELATIONSHIP",
    subjectId: "forest-deer-parent-offspring",
    entityId: DEER_OFFSPRING,
    currentlySeparated: true,
    existingActiveSeparation: null,
    tick: 5,
  })
  assert.equal(separated.separationState?.active, true)

  const reunited = evaluateSeparationTransition({
    worldId: WORLD_ID,
    subjectType: "RELATIONSHIP",
    subjectId: "forest-deer-parent-offspring",
    entityId: DEER_OFFSPRING,
    currentlySeparated: false,
    existingActiveSeparation: separated.separationState,
    tick: 9,
  })
  assert.equal(reunited.reunionEvent?.separationDurationTicks, 4)
})

test("social perception resolves the same bounded facts for a deer herd at a forest clearing", () => {
  const relationship: RelationshipState = {
    id: "forest-deer-parent-offspring",
    worldId: WORLD_ID,
    entityAId: DEER_PARENT,
    entityBId: DEER_OFFSPRING,
    relationshipType: "PARENT_OFFSPRING",
    band: "WEAK",
    evidence: { coPresenceTicks: 1, sharedGroupTicks: 1, reunionCount: 0 },
    establishedTick: 0,
    lastRelevantTick: 1,
  }
  const perception = resolveSocialPerception({
    entityId: DEER_PARENT,
    currentLocationId: "forest-clearing",
    entityLocationsById: new Map([[DEER_PARENT, "forest-clearing"], [DEER_OFFSPRING, "forest-clearing"]]),
    relationships: [relationship],
    familiarityStates: [],
    groupId: "deer-herd-1",
    groupMemberEntityIds: [DEER_PARENT, DEER_OFFSPRING],
    groupLocationId: "forest-clearing",
    withinHomeRange: true,
    separationActive: false,
  })
  assert.deepEqual(perception.nearbyKnownEntityIds, [DEER_OFFSPRING])
  assert.deepEqual(perception.groupMembersPresentIds, [DEER_OFFSPRING])
})

test("place attachment resolves identically for a forest home range", () => {
  const homeRange = { id: "deer-herd-1-home-range", worldId: WORLD_ID, ownerType: "GROUP" as const, ownerId: "deer-herd-1", preferredLocationIds: ["forest-clearing"], establishedTick: 0 }
  assert.equal(resolvePlaceAttachment("GROUP", "deer-herd-1", "forest-clearing", homeRange).withinHomeRange, true)
  assert.equal(resolvePlaceAttachment("GROUP", "deer-herd-1", "forest-stream", homeRange).withinHomeRange, false)
})
