import { test } from "node:test"
import assert from "node:assert/strict"
import { ExperienceRegistry } from "./registry.ts"
import { InMemoryExperienceEventRepository } from "./inMemoryRepository.ts"
import { ExperienceValidationError } from "./validation.ts"
import { CURRENT_EXPERIENCE_SCHEMA_VERSION } from "./types.ts"
import type { ExperienceEventInput } from "./types.ts"

function makeRegistry() {
  const repository = new InMemoryExperienceEventRepository()
  let clock = 0
  let ids = 0
  const registry = new ExperienceRegistry(repository, {
    now: () => `2026-01-01T00:00:0${clock++}.000Z`,
    generateId: () => `event-${ids++}`,
  })
  return { registry, repository }
}

function baseInput(overrides: Partial<ExperienceEventInput> = {}): ExperienceEventInput {
  return {
    type: "narrative.started",
    source: { productId: "prometheusk" },
    actor: { userId: "user-1" },
    ...overrides,
  }
}

test("recordEvent stamps id, schemaVersion, and recordedAt; defaults occurredAt to recordedAt", async () => {
  const { registry } = makeRegistry()
  const event = await registry.recordEvent(baseInput())
  assert.equal(event.id, "event-0")
  assert.equal(event.schemaVersion, CURRENT_EXPERIENCE_SCHEMA_VERSION)
  assert.equal(event.occurredAt, event.recordedAt)
})

test("recordEvent preserves a producer-supplied occurredAt distinct from recordedAt", async () => {
  const { registry } = makeRegistry()
  const event = await registry.recordEvent(baseInput({ occurredAt: "2020-01-01T00:00:00.000Z" }))
  assert.equal(event.occurredAt, "2020-01-01T00:00:00.000Z")
  assert.notEqual(event.occurredAt, event.recordedAt)
})

test("recordEvent returns an immutable event", async () => {
  const { registry } = makeRegistry()
  const event = await registry.recordEvent(baseInput())
  assert.ok(Object.isFrozen(event))
  assert.ok(Object.isFrozen(event.metadata))
})

test("recordEvent rejects malformed metadata and never stores the event", async () => {
  const { registry, repository } = makeRegistry()
  await assert.rejects(
    () => registry.recordEvent(baseInput({ metadata: { apiKey: "leaked" } })),
    ExperienceValidationError,
  )
  assert.deepEqual(await repository.findByUser("user-1"), [])
})

test("recordEvent rejects a malformed type and never stores the event", async () => {
  const { registry, repository } = makeRegistry()
  await assert.rejects(() => registry.recordEvent(baseInput({ type: "NotValid" })), ExperienceValidationError)
  assert.deepEqual(await repository.findByUser("user-1"), [])
})

test("recordEvent accepts a well-formed type outside the curated known list", async () => {
  const { registry } = makeRegistry()
  const event = await registry.recordEvent(baseInput({ type: "digitaltwin.snapshot_generated" }))
  assert.equal(event.type, "digitaltwin.snapshot_generated")
})

test("getEvent enforces user isolation -- another user's id returns null, not the event", async () => {
  const { registry } = makeRegistry()
  const event = await registry.recordEvent(baseInput({ actor: { userId: "user-1" } }))
  assert.deepEqual(await registry.getEvent(event.id, "user-1"), event)
  assert.equal(await registry.getEvent(event.id, "user-2"), null)
})

test("a user with no recorded events sees an honestly empty timeline", async () => {
  const { registry } = makeRegistry()
  assert.deepEqual(await registry.listTimeline("nobody"), [])
  assert.deepEqual(await registry.listRecentEvents("nobody"), [])
})

test("listEventsByType filters to the requested type only", async () => {
  const { registry } = makeRegistry()
  await registry.recordEvent(baseInput({ type: "narrative.started" }))
  await registry.recordEvent(baseInput({ type: "episode.completed" }))

  const events = await registry.listEventsByType("user-1", "episode.completed")
  assert.equal(events.length, 1)
  assert.equal(events[0].type, "episode.completed")
})

test("listEventsByCorrelation groups events sharing a correlationId, scoped to the caller's user", async () => {
  const { registry } = makeRegistry()
  const first = await registry.recordEvent(baseInput({ correlationId: "session-42" }))
  const second = await registry.recordEvent(baseInput({ type: "episode.completed", correlationId: "session-42" }))
  await registry.recordEvent(baseInput({ correlationId: "session-99" }))

  const correlated = await registry.listEventsByCorrelation("session-42", "user-1")
  assert.deepEqual(
    correlated.map((e) => e.id).sort(),
    [first.id, second.id].sort(),
  )
})

test("listRecentEvents respects its limit and defaults to most-recent-first", async () => {
  const { registry } = makeRegistry()
  await registry.recordEvent(baseInput())
  await registry.recordEvent(baseInput())
  const third = await registry.recordEvent(baseInput())

  const recent = await registry.listRecentEvents("user-1", 1)
  assert.equal(recent.length, 1)
  assert.equal(recent[0].id, third.id)
})
