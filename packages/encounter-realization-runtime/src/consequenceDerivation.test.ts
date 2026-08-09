import assert from "node:assert/strict"
import { test } from "node:test"
import { deriveConsequences } from "./consequenceDerivation.ts"
import type { DeriveConsequencesParams } from "./consequenceDerivation.ts"

const BASE: DeriveConsequencesParams = { status: "REALIZED", ruleId: "rule-1", locationId: "loc-1", participantEntityIds: ["a", "b"], relationshipIdsInvolved: ["rel-1"] }

test("a non-REALIZED status derives zero consequences -- EXPIRED/BLOCKED never fabricates a consequence", () => {
  assert.deepEqual(deriveConsequences({ ...BASE, status: "EXPIRED" }), [])
  assert.deepEqual(deriveConsequences({ ...BASE, status: "BLOCKED" }), [])
})

test("REALIZED derives one WORLD_MEMORY RESOURCE_PREFERENCE consequence per participant", () => {
  const consequences = deriveConsequences(BASE)
  const resourcePrefs = consequences.filter((c) => c.domain === "WORLD_MEMORY" && c.worldConsequence.type === "RESOURCE_PREFERENCE")
  assert.equal(resourcePrefs.length, 2)
  assert.deepEqual(
    resourcePrefs.map((c) => (c.domain === "WORLD_MEMORY" ? c.worldConsequence.targetEntityId : null)),
    ["a", "b"],
  )
})

test("REALIZED derives exactly one LOCATION_HISTORY_MARKER consequence for the place", () => {
  const consequences = deriveConsequences(BASE)
  const markers = consequences.filter((c) => c.domain === "WORLD_MEMORY" && c.worldConsequence.type === "LOCATION_HISTORY_MARKER")
  assert.equal(markers.length, 1)
})

test("REALIZED derives one RELATIONSHIP ENCOUNTER_EVIDENCE consequence per involved relationship, none when no relationship is involved", () => {
  const withRelationship = deriveConsequences(BASE)
  assert.equal(withRelationship.filter((c) => c.domain === "RELATIONSHIP").length, 1)

  const withoutRelationship = deriveConsequences({ ...BASE, relationshipIdsInvolved: [] })
  assert.equal(withoutRelationship.filter((c) => c.domain === "RELATIONSHIP").length, 0)
})

test("is bounded -- no per-tick-growing list, exactly participants.length + 1 + relationships.length consequences", () => {
  const consequences = deriveConsequences(BASE)
  assert.equal(consequences.length, BASE.participantEntityIds.length + 1 + BASE.relationshipIdsInvolved.length)
})
