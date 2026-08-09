import { test } from "node:test"
import assert from "node:assert/strict"
import type { EncounterOpportunity } from "@avatark/living-population-contracts"
import type { ProtectedNarrativeProjection } from "@avatark/living-systems-contracts"
import { deriveConsequences } from "./consequenceDerivation.ts"
import { deriveEncounterRecordId } from "./encounterIdentity.ts"
import { resolveEncounterRealization } from "./encounterRealizationResolution.ts"

// Sprint 14, Phase G: the SAME fictional, non-canonical "living-forest"
// fixture Sprints 7/9/10/11/12 already established, run here through
// this package's own pure functions -- realization resolution,
// consequence derivation, record identity -- to prove none of it is
// Living-Vrindavan-specific. No line in this package's own src/ mentions
// "vrindavan," "cow," "yamuna," or any franchise/reference-entity name.

const WORLD_ID = "living-forest-fixture"
const DEER_PARENT = "deer-1"
const DEER_OFFSPRING = "deer-2"
const RESOLVED_NARRATIVE: ProtectedNarrativeProjection = { worldId: WORLD_ID, episodeRef: null, sceneRef: null, resolved: true }

const OPPORTUNITY: EncounterOpportunity = { ruleId: "forest-clearing-ambient-presence", locationId: "forest-clearing", category: "ambient", contributingEntityIds: [DEER_PARENT, DEER_OFFSPRING], tick: 4 }

test("a deer herd converging at a forest clearing realizes through the identical causal resolver Vrindavan's own cows/birds use, zero forest-specific branching", () => {
  const result = resolveEncounterRealization({
    opportunity: OPPORTUNITY,
    protectedNarrative: RESOLVED_NARRATIVE,
    presentEntityIds: [DEER_PARENT, DEER_OFFSPRING],
    routineCompatibleEntityIds: [DEER_PARENT, DEER_OFFSPRING],
    groupCohesion: 1,
    relationshipBand: "STRONG",
    resourceOpportunityAvailable: true,
    variation: 0.5,
  })
  assert.equal(result.status, "REALIZED")
})

test("consequence derivation for the deer herd's own realized encounter is identical in shape to any other fixture -- one RESOURCE_PREFERENCE per participant, one LOCATION_HISTORY_MARKER, one relationship-evidence consequence", () => {
  const consequences = deriveConsequences({
    status: "REALIZED",
    ruleId: OPPORTUNITY.ruleId,
    locationId: OPPORTUNITY.locationId,
    participantEntityIds: OPPORTUNITY.contributingEntityIds,
    relationshipIdsInvolved: ["forest-deer-parent-offspring"],
  })
  assert.equal(consequences.filter((c) => c.domain === "WORLD_MEMORY" && c.worldConsequence.type === "RESOURCE_PREFERENCE").length, 2)
  assert.equal(consequences.filter((c) => c.domain === "WORLD_MEMORY" && c.worldConsequence.type === "LOCATION_HISTORY_MARKER").length, 1)
  assert.equal(consequences.filter((c) => c.domain === "RELATIONSHIP").length, 1)
})

test("record identity is deterministic and order-independent for the deer herd's own entity ids, the identical property proven for Vrindavan's own fixtures", () => {
  const a = deriveEncounterRecordId(WORLD_ID, OPPORTUNITY.ruleId, OPPORTUNITY.locationId, [DEER_PARENT, DEER_OFFSPRING], 4)
  const b = deriveEncounterRecordId(WORLD_ID, OPPORTUNITY.ruleId, OPPORTUNITY.locationId, [DEER_OFFSPRING, DEER_PARENT], 4)
  assert.equal(a, b)
})

test("a missed convergence (no routine compatibility) EXPIRES for the deer herd exactly as it would for any other fixture -- no consequence fabricated", () => {
  const result = resolveEncounterRealization({
    opportunity: OPPORTUNITY,
    protectedNarrative: RESOLVED_NARRATIVE,
    presentEntityIds: [DEER_PARENT, DEER_OFFSPRING],
    routineCompatibleEntityIds: [],
    groupCohesion: null,
    relationshipBand: null,
    resourceOpportunityAvailable: false,
    variation: 0.5,
  })
  assert.equal(result.status, "EXPIRED")
  assert.deepEqual(deriveConsequences({ status: result.status, ruleId: OPPORTUNITY.ruleId, locationId: OPPORTUNITY.locationId, participantEntityIds: OPPORTUNITY.contributingEntityIds, relationshipIdsInvolved: [] }), [])
})
