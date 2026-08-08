import { test } from "node:test"
import assert from "node:assert/strict"
import { projectVisitorWorldMemory } from "./visitorMemoryProjection.ts"
import type { WorldDefinition, WorldState } from "@avatark/living-world-runtime"
import type { ExperienceEvent } from "@avatark/experience-registry"

const DEFINITION: WorldDefinition = {
  id: "living-vrindavan",
  name: "Living Vrindavan",
  entryLocationId: "vrindavan-entry",
  locations: [
    { id: "vrindavan-entry", name: "Vrindavan Entry", order: 0 },
    { id: "yamuna", name: "Yamuna", order: 1 },
  ],
  activities: [],
}

function reflectionEvent(locationId: string, reflectionId: string): ExperienceEvent {
  return {
    id: "e1",
    schemaVersion: 1,
    type: "reflection.created",
    source: { productId: "avatark" },
    actor: { userId: "u1" },
    target: { type: "location", id: locationId },
    metadata: { reflectionId },
    occurredAt: "2026-08-08T00:00:00.000Z",
    recordedAt: "2026-08-08T00:00:00.000Z",
  }
}

test("lastLocationId comes from the existing WorldState, never re-derived from events", () => {
  const state: WorldState = { currentLocationId: "yamuna", visitedLocationIds: ["vrindavan-entry", "yamuna"], unlockedLocationIds: ["vrindavan-entry", "yamuna"], recentVisits: [], active: true, lastVisitAt: "2026-08-08T00:00:00.000Z" } as unknown as WorldState
  const memory = projectVisitorWorldMemory("u1", DEFINITION, state, [], 5)
  assert.equal(memory.lastLocationId, "yamuna")
})

test("lastLocationId is honestly null when no WorldState exists yet -- never fabricated", () => {
  const memory = projectVisitorWorldMemory("u1", DEFINITION, null, [], 5)
  assert.equal(memory.lastLocationId, null)
})

test("reflectionRefs surfaces only reflection.created events belonging to this world's own locations", () => {
  const inWorld = reflectionEvent("yamuna", "living-vrindavan#yamuna")
  const otherWorld = reflectionEvent("some-other-worlds-location", "other-world#somewhere")
  const memory = projectVisitorWorldMemory("u1", DEFINITION, null, [inWorld, otherWorld], 5)
  assert.equal(memory.reflectionRefs.length, 1)
  assert.equal(memory.reflectionRefs[0].id, "living-vrindavan#yamuna")
})

test("meaningfulEncounters is honestly empty -- no event type exists yet to derive it from", () => {
  const memory = projectVisitorWorldMemory("u1", DEFINITION, null, [], 5)
  assert.deepEqual(memory.meaningfulEncounters, [])
})

test("updatedAtTick reflects the tick this projection was taken at", () => {
  const memory = projectVisitorWorldMemory("u1", DEFINITION, null, [], 42)
  assert.equal(memory.updatedAtTick, 42)
})
