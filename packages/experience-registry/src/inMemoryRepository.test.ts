import { test } from "node:test"
import assert from "node:assert/strict"
import { InMemoryExperienceEventRepository } from "./inMemoryRepository.ts"
import type { ExperienceEvent } from "./types.ts"

let nextId = 0
function makeEvent(overrides: Partial<ExperienceEvent> = {}): ExperienceEvent {
  nextId += 1
  return {
    id: `event-${nextId}`,
    schemaVersion: 1,
    type: "narrative.started",
    source: { productId: "prometheusk" },
    actor: { userId: "user-1" },
    metadata: {},
    occurredAt: "2026-01-01T00:00:00.000Z",
    recordedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

test("insert then findById returns the same event for its owner", async () => {
  const repo = new InMemoryExperienceEventRepository()
  const event = makeEvent()
  await repo.insert(event)
  const found = await repo.findById(event.id, event.actor.userId)
  assert.deepEqual(found, event)
})

test("findById returns null for a different user -- no cross-user leakage", async () => {
  const repo = new InMemoryExperienceEventRepository()
  const event = makeEvent({ actor: { userId: "user-1" } })
  await repo.insert(event)
  assert.equal(await repo.findById(event.id, "user-2"), null)
})

test("findByUser only returns that user's events", async () => {
  const repo = new InMemoryExperienceEventRepository()
  await repo.insert(makeEvent({ actor: { userId: "user-1" } }))
  await repo.insert(makeEvent({ actor: { userId: "user-2" } }))
  await repo.insert(makeEvent({ actor: { userId: "user-1" } }))

  const events = await repo.findByUser("user-1")
  assert.equal(events.length, 2)
  assert.ok(events.every((e) => e.actor.userId === "user-1"))
})

test("stored events are immutable (frozen), independent of the object passed to insert", async () => {
  const repo = new InMemoryExperienceEventRepository()
  const event = makeEvent()
  await repo.insert(event)
  const found = await repo.findById(event.id, event.actor.userId)
  assert.ok(found)
  assert.ok(Object.isFrozen(found))
  assert.ok(Object.isFrozen(found!.metadata))
  assert.throws(() => {
    // @ts-expect-error -- intentionally mutating a readonly/frozen field
    found!.type = "tampered"
  })
})

test("inserting a duplicate id throws -- append-only, no overwrite", async () => {
  const repo = new InMemoryExperienceEventRepository()
  const event = makeEvent()
  await repo.insert(event)
  await assert.rejects(() => repo.insert(event))
})

test("findByUser orders most-recent-first by recordedAt, tie-broken by insertion order", async () => {
  const repo = new InMemoryExperienceEventRepository()
  const first = makeEvent({ recordedAt: "2026-01-01T00:00:00.000Z" })
  const second = makeEvent({ recordedAt: "2026-01-02T00:00:00.000Z" })
  // Same recordedAt as `second` -- inserted after, so it should sort before `second`.
  const thirdSameInstant = makeEvent({ recordedAt: "2026-01-02T00:00:00.000Z" })

  await repo.insert(first)
  await repo.insert(second)
  await repo.insert(thirdSameInstant)

  const events = await repo.findByUser("user-1")
  assert.deepEqual(
    events.map((e) => e.id),
    [thirdSameInstant.id, second.id, first.id],
  )
})

test("findByUser filters by type", async () => {
  const repo = new InMemoryExperienceEventRepository()
  await repo.insert(makeEvent({ type: "narrative.started" }))
  await repo.insert(makeEvent({ type: "episode.completed" }))

  const events = await repo.findByUser("user-1", { types: ["episode.completed"] })
  assert.equal(events.length, 1)
  assert.equal(events[0].type, "episode.completed")
})

test("findByUser filters by before/after cursors and respects limit", async () => {
  const repo = new InMemoryExperienceEventRepository()
  await repo.insert(makeEvent({ recordedAt: "2026-01-01T00:00:00.000Z" }))
  await repo.insert(makeEvent({ recordedAt: "2026-01-02T00:00:00.000Z" }))
  await repo.insert(makeEvent({ recordedAt: "2026-01-03T00:00:00.000Z" }))

  const middleOnly = await repo.findByUser("user-1", {
    after: "2026-01-01T00:00:00.000Z",
    before: "2026-01-03T00:00:00.000Z",
  })
  assert.equal(middleOnly.length, 1)
  assert.equal(middleOnly[0].recordedAt, "2026-01-02T00:00:00.000Z")

  const limited = await repo.findByUser("user-1", { limit: 1 })
  assert.equal(limited.length, 1)
  assert.equal(limited[0].recordedAt, "2026-01-03T00:00:00.000Z")
})

test("findByCorrelationId scopes by both correlation and user", async () => {
  const repo = new InMemoryExperienceEventRepository()
  await repo.insert(makeEvent({ correlationId: "corr-1", actor: { userId: "user-1" } }))
  await repo.insert(makeEvent({ correlationId: "corr-1", actor: { userId: "user-2" } }))
  await repo.insert(makeEvent({ correlationId: "corr-2", actor: { userId: "user-1" } }))

  const events = await repo.findByCorrelationId("corr-1", "user-1")
  assert.equal(events.length, 1)
  assert.equal(events[0].actor.userId, "user-1")
  assert.equal(events[0].correlationId, "corr-1")
})

test("an unused user has an empty, truthful timeline -- never fabricated entries", async () => {
  const repo = new InMemoryExperienceEventRepository()
  assert.deepEqual(await repo.findByUser("nobody"), [])
})
