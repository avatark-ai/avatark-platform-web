import { test } from "node:test"
import assert from "node:assert/strict"
import { emptyProtectedNarrativeProjection } from "./protectedNarrative.ts"
import type { ProtectedNarrativeStateRepository } from "./protectedNarrative.ts"

test("emptyProtectedNarrativeProjection is honestly unresolved, never fabricated content", () => {
  const projection = emptyProtectedNarrativeProjection("living-vrindavan")
  assert.equal(projection.resolved, false)
  assert.equal(projection.episodeRef, null)
  assert.equal(projection.sceneRef, null)
})

test("ProtectedNarrativeStateRepository is satisfiable by a trivial read-only adapter, and the interface itself has no write method", () => {
  const repo: ProtectedNarrativeStateRepository = {
    get: async (worldId) => emptyProtectedNarrativeProjection(worldId),
  }
  // TypeScript-level proof this compiles with get() alone -- no save/put/mutate
  // exists on the interface. Runtime proof: calling the only method works.
  return repo.get("living-vrindavan").then((projection) => {
    assert.equal(projection.worldId, "living-vrindavan")
  })
})
