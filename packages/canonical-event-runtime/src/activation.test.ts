import assert from "node:assert/strict"
import { test } from "node:test"
import type { CanonicalEventDefinition } from "@avatark/canonical-event-contracts"
import { resolveCanonicalEventActivation } from "./activation.ts"

const DEFINITION: CanonicalEventDefinition = {
  identity: { canonicalEventId: "canonical-event-test", definitionContentHash: "hash-1" },
  category: "REQUIRED",
  activationConditions: [],
  mandatedFacts: [{ kind: "LOCATION_ACTIVE", locationId: "location-x" }],
  scope: { level: "WORLD" },
  provenance: { canonDocIds: ["doc-1"], specId: "spec-1", specVersion: 1, definitionContentHash: "hash-1" },
}

test("an eligible event with no prior state activates, computing a content-derived activationId", () => {
  const result = resolveCanonicalEventActivation({ worldInstanceId: "w1", definition: DEFINITION, eligibility: { canonicalEventId: "canonical-event-test", worldInstanceId: "w1", eligible: true, reasons: [] }, currentState: null, tick: 5 })
  assert.equal(result.status, "ACTIVATED")
  assert.ok(result.activationId)
  assert.equal(result.activatedAtTick, 5)
  assert.deepEqual(result.mandatedFacts, DEFINITION.mandatedFacts)
})

test("an ineligible event with no prior state stays DORMANT, with no activationId", () => {
  const result = resolveCanonicalEventActivation({ worldInstanceId: "w1", definition: DEFINITION, eligibility: { canonicalEventId: "canonical-event-test", worldInstanceId: "w1", eligible: false, reasons: [] }, currentState: null, tick: 5 })
  assert.equal(result.status, "DORMANT")
  assert.equal(result.activationId, null)
})

test("calling again once already ACTIVATED is a no-op -- identical activationId, no re-derivation, regardless of eligibility recomputing differently", () => {
  const activated = resolveCanonicalEventActivation({ worldInstanceId: "w1", definition: DEFINITION, eligibility: { canonicalEventId: "canonical-event-test", worldInstanceId: "w1", eligible: true, reasons: [] }, currentState: null, tick: 5 })
  const retried = resolveCanonicalEventActivation({ worldInstanceId: "w1", definition: DEFINITION, eligibility: { canonicalEventId: "canonical-event-test", worldInstanceId: "w1", eligible: false, reasons: [] }, currentState: activated, tick: 50 })
  assert.deepEqual(retried, activated, "already-activated state is returned completely unchanged -- idempotent by construction")
})

test("calling again once already COMPLETED (Host-advanced) is also a no-op", () => {
  const activated = resolveCanonicalEventActivation({ worldInstanceId: "w1", definition: DEFINITION, eligibility: { canonicalEventId: "canonical-event-test", worldInstanceId: "w1", eligible: true, reasons: [] }, currentState: null, tick: 5 })
  const completed = { ...activated, status: "COMPLETED" as const, completedAtTick: 5, worldEventId: "event-1" }
  const retried = resolveCanonicalEventActivation({ worldInstanceId: "w1", definition: DEFINITION, eligibility: { canonicalEventId: "canonical-event-test", worldInstanceId: "w1", eligible: true, reasons: [] }, currentState: completed, tick: 100 })
  assert.deepEqual(retried, completed)
})

test("a genuinely different tick produces a genuinely different activationId for a fresh activation", () => {
  const a = resolveCanonicalEventActivation({ worldInstanceId: "w1", definition: DEFINITION, eligibility: { canonicalEventId: "canonical-event-test", worldInstanceId: "w1", eligible: true, reasons: [] }, currentState: null, tick: 5 })
  const b = resolveCanonicalEventActivation({ worldInstanceId: "w1", definition: DEFINITION, eligibility: { canonicalEventId: "canonical-event-test", worldInstanceId: "w1", eligible: true, reasons: [] }, currentState: null, tick: 6 })
  assert.notEqual(a.activationId, b.activationId)
})
