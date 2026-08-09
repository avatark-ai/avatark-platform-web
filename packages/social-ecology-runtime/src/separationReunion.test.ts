import assert from "node:assert/strict"
import { test } from "node:test"
import { evaluateSeparationTransition } from "./separationReunion.ts"

const BASE = { worldId: "world-1", subjectType: "RELATIONSHIP", subjectId: "rel-1", entityId: "cow-a" } as const

test("evaluateSeparationTransition: not separated -> not separated is a no-op", () => {
  const result = evaluateSeparationTransition({ ...BASE, currentlySeparated: false, existingActiveSeparation: null, tick: 5 })
  assert.equal(result.separationState, null)
  assert.equal(result.reunionEvent, null)
})

test("evaluateSeparationTransition: not separated -> separated opens a new SeparationState", () => {
  const result = evaluateSeparationTransition({ ...BASE, currentlySeparated: true, existingActiveSeparation: null, tick: 5 })
  assert.notEqual(result.separationState, null)
  assert.equal(result.separationState?.active, true)
  assert.equal(result.separationState?.separatedSinceTick, 5)
  assert.equal(result.separationState?.resolvedAtTick, null)
  assert.equal(result.reunionEvent, null)
})

test("evaluateSeparationTransition: separated -> separated is stable (returns the existing record unchanged)", () => {
  const existing = { id: "sep-1", worldId: "world-1", subjectType: "RELATIONSHIP" as const, subjectId: "rel-1", entityId: "cow-a", separatedSinceTick: 5, active: true, resolvedAtTick: null }
  const result = evaluateSeparationTransition({ ...BASE, currentlySeparated: true, existingActiveSeparation: existing, tick: 8 })
  assert.deepEqual(result.separationState, existing)
  assert.equal(result.reunionEvent, null)
})

test("evaluateSeparationTransition: separated -> not separated resolves the SeparationState and fires a ReunionEvent", () => {
  const existing = { id: "sep-1", worldId: "world-1", subjectType: "RELATIONSHIP" as const, subjectId: "rel-1", entityId: "cow-a", separatedSinceTick: 5, active: true, resolvedAtTick: null }
  const result = evaluateSeparationTransition({ ...BASE, currentlySeparated: false, existingActiveSeparation: existing, tick: 12 })
  assert.equal(result.separationState?.active, false)
  assert.equal(result.separationState?.resolvedAtTick, 12)
  assert.notEqual(result.reunionEvent, null)
  assert.equal(result.reunionEvent?.separationDurationTicks, 7)
  assert.equal(result.reunionEvent?.tick, 12)
})

test("evaluateSeparationTransition: separation and reunion ids are deterministic across identical replay", () => {
  const a = evaluateSeparationTransition({ ...BASE, currentlySeparated: true, existingActiveSeparation: null, tick: 5 })
  const b = evaluateSeparationTransition({ ...BASE, currentlySeparated: true, existingActiveSeparation: null, tick: 5 })
  assert.equal(a.separationState?.id, b.separationState?.id)

  const existing = { id: "sep-1", worldId: "world-1", subjectType: "RELATIONSHIP" as const, subjectId: "rel-1", entityId: "cow-a", separatedSinceTick: 5, active: true, resolvedAtTick: null }
  const c = evaluateSeparationTransition({ ...BASE, currentlySeparated: false, existingActiveSeparation: existing, tick: 12 })
  const d = evaluateSeparationTransition({ ...BASE, currentlySeparated: false, existingActiveSeparation: existing, tick: 12 })
  assert.equal(c.reunionEvent?.id, d.reunionEvent?.id)
  assert.notEqual(c.reunionEvent?.id, a.separationState?.id)
})

test("evaluateSeparationTransition: subject type is threaded through (GROUP_MEMBERSHIP works identically)", () => {
  const result = evaluateSeparationTransition({ worldId: "world-1", subjectType: "GROUP_MEMBERSHIP", subjectId: "group-1", entityId: "cow-a", currentlySeparated: true, existingActiveSeparation: null, tick: 3 })
  assert.equal(result.separationState?.subjectType, "GROUP_MEMBERSHIP")
  assert.equal(result.separationState?.subjectId, "group-1")
})
