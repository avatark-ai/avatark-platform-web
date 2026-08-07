import { test } from "node:test"
import assert from "node:assert/strict"
import { ExperienceRegistry, InMemoryExperienceEventRepository } from "@avatark/experience-registry"
import { createExperienceActivityAdapter } from "./accountAdapter.ts"

function makeRegistry() {
  return new ExperienceRegistry(new InMemoryExperienceEventRepository())
}

test("shows a truthful empty state for a user with no events", async () => {
  const adapter = createExperienceActivityAdapter(makeRegistry(), "user-1")
  const result = await adapter.get()
  assert.deepEqual(result.data?.items, [])
  assert.equal(result.data?.emptyMessage, "No activity yet.")
})

test("maps recorded events to humanized extension items, most-recent-first", async () => {
  const registry = makeRegistry()
  await registry.recordEvent({
    type: "narrative.started",
    source: { productId: "prometheusk" },
    actor: { userId: "user-1" },
  })
  await registry.recordEvent({
    type: "episode.completed",
    source: { productId: "prometheusk" },
    actor: { userId: "user-1" },
  })

  const adapter = createExperienceActivityAdapter(registry, "user-1")
  const result = await adapter.get()
  assert.equal(result.error, undefined)
  assert.equal(result.data?.items.length, 2)
  assert.equal(result.data?.items[0].title, "Episode completed")
  assert.equal(result.data?.emptyMessage, undefined)
})

test("only surfaces the requesting user's own events", async () => {
  const registry = makeRegistry()
  await registry.recordEvent({
    type: "narrative.started",
    source: { productId: "prometheusk" },
    actor: { userId: "someone-else" },
  })

  const adapter = createExperienceActivityAdapter(registry, "user-1")
  const result = await adapter.get()
  assert.deepEqual(result.data?.items, [])
})

test("slotId and label default sensibly and are overridable", () => {
  const registry = makeRegistry()
  const defaultAdapter = createExperienceActivityAdapter(registry, "user-1")
  assert.equal(defaultAdapter.slotId, "experience-activity")
  assert.equal(defaultAdapter.label, "Recent Activity")

  const customAdapter = createExperienceActivityAdapter(registry, "user-1", {
    slotId: "custom-slot",
    label: "My Feed",
  })
  assert.equal(customAdapter.slotId, "custom-slot")
  assert.equal(customAdapter.label, "My Feed")
})

test("get() returns an error result instead of throwing when the registry fails", async () => {
  const failingRegistry = {
    listRecentEvents: async () => {
      throw new Error("boom")
    },
  } as unknown as ExperienceRegistry
  const adapter = createExperienceActivityAdapter(failingRegistry, "user-1")
  const result = await adapter.get()
  assert.equal(result.data, undefined)
  assert.equal(result.error, "boom")
})
