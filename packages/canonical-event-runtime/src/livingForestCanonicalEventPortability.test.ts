import assert from "node:assert/strict"
import { test } from "node:test"
import type { CanonicalEventDefinition } from "@avatark/canonical-event-contracts"
import { evaluateCanonicalEventEligibility } from "./eligibility.ts"
import { resolveCanonicalEventActivation } from "./activation.ts"
import { InMemoryWorldInstanceCanonicalProjectionStateRepository } from "./inMemoryRepositories.ts"

// Sprint 18, Phase 0 §28 proof G (World Neutrality): the exact same
// `evaluateCanonicalEventEligibility`/`resolveCanonicalEventActivation`
// functions Vrindavan's own Host layer calls, run against a wholly
// fictional, non-Vrindavan world grammar -- a synthetic Living Forest
// canonical event fixture, the same fictional-fixture convention every
// sibling sprint's own "livingForest*Portability.test.ts" already
// established. Zero occurrence of "vrindavan," "yamuna," "cow," "govardhan,"
// or any franchise/reference-entity name anywhere in
// canonical-event-contracts/canonical-event-runtime (verified by direct
// grep in the dependency-boundary test, lib/runtimeKernel/dependencyBoundaries.test.ts).
const FOREST_CANONICAL_EVENT: CanonicalEventDefinition = {
  identity: { canonicalEventId: "canonical-event-forest-alpha", definitionContentHash: "forest-hash-1" },
  category: "REQUIRED",
  activationConditions: [
    { kind: "SEASON_EQUALS", seasonId: "forest-autumn" },
    { kind: "LOCATION_REACHED", locationId: "forest-clearing" },
  ],
  mandatedFacts: [{ kind: "LOCATION_ACTIVE", locationId: "forest-clearing" }],
  scope: { level: "PATCH", patchId: "F01-Q-NW-P01" },
  provenance: { canonDocIds: ["FOREST-CAN-001"], specId: "FOREST-SPEC-001", specVersion: 1, definitionContentHash: "forest-hash-1" },
}

test("Living Forest fixture: the identical eligibility/activation functions Vrindavan uses correctly gate and activate a wholly fictional canonical event", async () => {
  const repo = new InMemoryWorldInstanceCanonicalProjectionStateRepository()
  const worldInstanceId = "living-forest-world"

  const contextBeforeReached = { tick: 10, seasonId: "forest-autumn", worldInstancePhase: null, completedCanonicalEventIds: new Set<string>(), reachedLocationIds: new Set<string>(), narrativeGatesResolved: {} }
  const eligibilityBefore = evaluateCanonicalEventEligibility(FOREST_CANONICAL_EVENT, worldInstanceId, contextBeforeReached)
  assert.equal(eligibilityBefore.eligible, false, "location not yet reached -- not eligible")

  const contextAfterReached = { ...contextBeforeReached, reachedLocationIds: new Set(["forest-clearing"]) }
  const eligibilityAfter = evaluateCanonicalEventEligibility(FOREST_CANONICAL_EVENT, worldInstanceId, contextAfterReached)
  assert.equal(eligibilityAfter.eligible, true)

  const existing = await repo.get(worldInstanceId, FOREST_CANONICAL_EVENT.identity.canonicalEventId)
  const activated = resolveCanonicalEventActivation({ worldInstanceId, definition: FOREST_CANONICAL_EVENT, eligibility: eligibilityAfter, currentState: existing, tick: 10 })
  await repo.save(activated)

  assert.equal(activated.status, "ACTIVATED")
  assert.ok(activated.activationId)

  // Idempotent retry against the same, non-Vrindavan fixture.
  const retried = resolveCanonicalEventActivation({ worldInstanceId, definition: FOREST_CANONICAL_EVENT, eligibility: eligibilityAfter, currentState: await repo.get(worldInstanceId, FOREST_CANONICAL_EVENT.identity.canonicalEventId), tick: 10 })
  assert.deepEqual(retried, activated)
})
