import assert from "node:assert/strict"
import { test } from "node:test"
import { deriveCanonicalActivationId, deriveDefinitionContentHash } from "./activationIdentity.ts"

test("deriveCanonicalActivationId is deterministic for identical inputs", () => {
  const a = deriveCanonicalActivationId("world-1", "canonical-event-alpha", "hash-1", 10)
  const b = deriveCanonicalActivationId("world-1", "canonical-event-alpha", "hash-1", 10)
  assert.equal(a, b)
})

test("deriveCanonicalActivationId changes when any input changes", () => {
  const base = deriveCanonicalActivationId("world-1", "canonical-event-alpha", "hash-1", 10)
  assert.notEqual(deriveCanonicalActivationId("world-2", "canonical-event-alpha", "hash-1", 10), base)
  assert.notEqual(deriveCanonicalActivationId("world-1", "canonical-event-beta", "hash-1", 10), base)
  assert.notEqual(deriveCanonicalActivationId("world-1", "canonical-event-alpha", "hash-2", 10), base)
  assert.notEqual(deriveCanonicalActivationId("world-1", "canonical-event-alpha", "hash-1", 20), base)
})

test("deriveDefinitionContentHash is deterministic and content-sensitive", () => {
  const a = deriveDefinitionContentHash("canonical-event-alpha", [{ kind: "WORLD_TIME_AT_LEAST", tick: 5 }], [], { level: "WORLD" })
  const b = deriveDefinitionContentHash("canonical-event-alpha", [{ kind: "WORLD_TIME_AT_LEAST", tick: 5 }], [], { level: "WORLD" })
  assert.equal(a, b)
  const c = deriveDefinitionContentHash("canonical-event-alpha", [{ kind: "WORLD_TIME_AT_LEAST", tick: 6 }], [], { level: "WORLD" })
  assert.notEqual(a, c)
})
