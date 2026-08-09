import assert from "node:assert/strict"
import { test } from "node:test"
import type { EncounterOpportunity } from "@avatark/living-population-contracts"
import type { ProtectedNarrativeProjection } from "@avatark/living-systems-contracts"
import { resolveEncounterRealization } from "./encounterRealizationResolution.ts"
import type { ResolveEncounterRealizationParams } from "./encounterRealizationResolution.ts"

const OPPORTUNITY: EncounterOpportunity = { ruleId: "rule-1", locationId: "loc-1", category: "ambient", contributingEntityIds: ["a", "b"], tick: 10 }
const UNRESOLVED_NARRATIVE: ProtectedNarrativeProjection = { worldId: "w1", episodeRef: null, sceneRef: null, resolved: false }
const RESOLVED_NARRATIVE: ProtectedNarrativeProjection = { worldId: "w1", episodeRef: "ep-1", sceneRef: "sc-1", resolved: true }

function baseParams(overrides: Partial<ResolveEncounterRealizationParams> = {}): ResolveEncounterRealizationParams {
  return {
    opportunity: OPPORTUNITY,
    protectedNarrative: RESOLVED_NARRATIVE,
    presentEntityIds: ["a", "b"],
    routineCompatibleEntityIds: ["a", "b"],
    groupCohesion: null,
    relationshipBand: null,
    resourceOpportunityAvailable: false,
    variation: 0.5,
    ...overrides,
  }
}

test("a narrative-protected opportunity is BLOCKED whenever the protected-narrative gate is unresolved, regardless of every other causal factor", () => {
  const result = resolveEncounterRealization(baseParams({ opportunity: { ...OPPORTUNITY, category: "narrative-protected" }, protectedNarrative: UNRESOLVED_NARRATIVE, groupCohesion: 1, relationshipBand: "STRONG", resourceOpportunityAvailable: true }))
  assert.equal(result.status, "BLOCKED")
})

test("a narrative-protected opportunity is NOT blocked once the protected-narrative gate is actually resolved", () => {
  const result = resolveEncounterRealization(baseParams({ opportunity: { ...OPPORTUNITY, category: "narrative-protected" }, protectedNarrative: RESOLVED_NARRATIVE, groupCohesion: 1, relationshipBand: "STRONG", resourceOpportunityAvailable: true }))
  assert.notEqual(result.status, "BLOCKED")
})

test("EXPIRED when none of the opportunity's contributing entities are still present", () => {
  const result = resolveEncounterRealization(baseParams({ presentEntityIds: ["c", "d"] }))
  assert.equal(result.status, "EXPIRED")
})

test("EXPIRED when present entities are all mid-transit (zero routine compatibility) -- no consequence is fabricated for a passing overlap", () => {
  const result = resolveEncounterRealization(baseParams({ routineCompatibleEntityIds: [] }))
  assert.equal(result.status, "EXPIRED")
})

test("REALIZED when routine compatibility, group cohesion, relationship, and resource opportunity all converge -- multiple causal factors, not one", () => {
  const result = resolveEncounterRealization(baseParams({ groupCohesion: 1, relationshipBand: "STRONG", resourceOpportunityAvailable: true }))
  assert.equal(result.status, "REALIZED")
  assert.ok(result.causalReferences.some((r) => r.kind === "groupCohesion"))
  assert.ok(result.causalReferences.some((r) => r.kind === "relationshipBand"))
  assert.ok(result.causalReferences.some((r) => r.kind === "resourceOpportunity"))
})

test("weak causal signal alone (routine compatibility only, no cohesion/relationship/resource) EXPIRES rather than realizing", () => {
  const result = resolveEncounterRealization(baseParams({ routineCompatibleEntityIds: ["a"], presentEntityIds: ["a", "b"] }))
  assert.equal(result.status, "EXPIRED")
})

test("in the bounded-ambiguity band, a lower deterministic-variation value realizes and a higher one expires the identical causal inputs -- variation resolves ambiguity, it does not replace causality", () => {
  // Full routine compatibility alone scores exactly 0.5 -- inside the
  // (0.25, 0.6) ambiguity band, with no cohesion/relationship/resource
  // bonus pushing it to a conclusive REALIZED on its own.
  const params = baseParams()
  const favorable = resolveEncounterRealization({ ...params, variation: 0.01 })
  const unfavorable = resolveEncounterRealization({ ...params, variation: 0.99 })
  assert.equal(favorable.status, "REALIZED")
  assert.equal(unfavorable.status, "EXPIRED")
  assert.equal(favorable.variationConsulted, 0.01)
})

test("identical inputs always produce the identical result -- pure and deterministic, the replay proof's own requirement", () => {
  const params = baseParams({ groupCohesion: 0.6, variation: 0.4 })
  const first = resolveEncounterRealization(params)
  const second = resolveEncounterRealization(params)
  assert.deepEqual(first, second)
})
