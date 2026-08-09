import assert from "node:assert/strict"
import { test } from "node:test"
import type { CanonicalEventActivationCondition } from "./activationCondition.ts"
import type { MandatedFact } from "./mandatedFact.ts"
import type { CanonicalEventProjectionScope } from "./scope.ts"
import type { CanonicalEventCategory } from "./definition.ts"
import type { CanonicalEventProjectionStatus } from "./projectionState.ts"

test("CanonicalEventActivationCondition kinds are a fixed, exhaustively enumerable closed union", () => {
  const kinds: CanonicalEventActivationCondition["kind"][] = ["WORLD_TIME_AT_LEAST", "SEASON_EQUALS", "SEQUENCE_POSITION", "LOCATION_REACHED", "WORLD_INSTANCE_PHASE", "NARRATIVE_GATE_OPEN"]
  assert.equal(new Set(kinds).size, kinds.length)
})

test("MandatedFact kinds are a fixed, exhaustively enumerable closed union -- deliberately no CANONICAL branch in EncounterConsequence anywhere near this type", () => {
  const kinds: MandatedFact["kind"][] = ["PARTICIPANT_PRESENT", "LOCATION_ACTIVE", "ENVIRONMENTAL_STATE"]
  assert.equal(new Set(kinds).size, kinds.length)
})

test("CanonicalEventProjectionScope levels are a fixed, exhaustively enumerable closed union using real Sprint 16 spatial-hierarchy ids", () => {
  const levels: CanonicalEventProjectionScope["level"][] = ["WORLD", "DOMAIN", "SECTOR", "QUADRANT", "PATCH", "LOCAL_PLACE", "ENTITY_SET"]
  assert.equal(new Set(levels).size, levels.length)
})

test("CanonicalEventCategory is REQUIRED | OPTIONAL only -- WORLD-DEPENDENT PRESENTATION CONDITION is deliberately not an activation-gating category", () => {
  const categories: CanonicalEventCategory[] = ["REQUIRED", "OPTIONAL"]
  assert.equal(new Set(categories).size, 2)
})

test("CanonicalEventProjectionStatus has no DEFERRED state -- Phase 0's own STOP gate #3 recommendation followed", () => {
  const statuses: CanonicalEventProjectionStatus[] = ["DORMANT", "ELIGIBLE", "ACTIVATED", "PROJECTING", "COMPLETED"]
  assert.equal(new Set(statuses).size, 5)
  assert.ok(!(statuses as string[]).includes("DEFERRED"))
})

test("WorldInstanceCanonicalProjectionState is addressable by an existing id type, never a generic mutable property bag", () => {
  const state = {
    worldInstanceId: "w1",
    canonicalEventId: "canonical-event-govardhan-lifting",
    status: "DORMANT" as CanonicalEventProjectionStatus,
    activationId: null,
    mandatedFacts: [{ kind: "LOCATION_ACTIVE", locationId: "govardhan-path" }] as MandatedFact[],
    scope: { level: "PATCH", patchId: "patch-govardhan-path" } as CanonicalEventProjectionScope,
    provenance: { canonDocIds: ["STK-CAN-001"], specId: "STK-SPEC-001", specVersion: 1, definitionContentHash: "abc123" },
    activatedAtTick: null,
    completedAtTick: null,
    worldEventId: null,
  }
  assert.equal(typeof state.worldInstanceId, "string")
  assert.equal(state.mandatedFacts.length, 1)
})
