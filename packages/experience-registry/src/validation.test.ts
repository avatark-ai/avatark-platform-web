import { test } from "node:test"
import assert from "node:assert/strict"
import {
  ExperienceValidationError,
  isWellFormedExperienceType,
  validateEventInput,
  validateMetadata,
  MAX_METADATA_KEYS,
  MAX_METADATA_BYTES,
} from "./validation.ts"
import type { ExperienceEventInput } from "./types.ts"

function baseInput(overrides: Partial<ExperienceEventInput> = {}): ExperienceEventInput {
  return {
    type: "narrative.started",
    source: { productId: "prometheusk" },
    actor: { userId: "user-1" },
    ...overrides,
  }
}

test("known event types are well-formed", () => {
  assert.equal(isWellFormedExperienceType("identity.signed_in"), true)
  assert.equal(isWellFormedExperienceType("game.session_started"), true)
})

test("unknown but well-formed event types are accepted -- the vocabulary is extensible", () => {
  assert.equal(isWellFormedExperienceType("worldbuilding.artifact_crafted"), true)
  assert.deepEqual(validateEventInput(baseInput({ type: "worldbuilding.artifact_crafted" })), [])
})

test("malformed event types are rejected", () => {
  for (const bad of ["NoDots", "no-namespace", "trailing.", ".leading", "", "has spaces.here"]) {
    assert.equal(isWellFormedExperienceType(bad), false, `"${bad}" should be malformed`)
  }
})

test("validateEventInput requires type, source.productId, actor.userId", () => {
  assert.deepEqual(validateEventInput(baseInput()), [])
  assert.ok(validateEventInput(baseInput({ type: "" })).length > 0)
  assert.ok(validateEventInput(baseInput({ source: { productId: "" } })).length > 0)
  assert.ok(validateEventInput(baseInput({ actor: { userId: "" } })).length > 0)
})

test("target requires both type and id when present", () => {
  const withTarget = baseInput({ target: { type: "world", id: "world-1" } })
  assert.deepEqual(validateEventInput(withTarget), [])

  // @ts-expect-error -- deliberately malformed for the test
  const missingId = baseInput({ target: { type: "world" } })
  assert.ok(validateEventInput(missingId).length > 0)
})

test("metadata rejects nested objects, arrays, and non-primitive values", () => {
  // @ts-expect-error -- deliberately malformed for the test
  const issues = validateMetadata({ nested: { a: 1 } })
  assert.ok(issues.some((i) => i.includes("nested")))
})

test("metadata rejects secret-shaped keys", () => {
  const issues = validateMetadata({ apiKey: "abc123" })
  assert.ok(issues.some((i) => i.includes("apiKey")))
})

test("metadata rejects too many keys", () => {
  const metadata: Record<string, string> = {}
  for (let i = 0; i < MAX_METADATA_KEYS + 1; i++) metadata[`key${i}`] = "v"
  const issues = validateMetadata(metadata)
  assert.ok(issues.some((i) => i.includes("exceeds the max")))
})

test("metadata rejects payloads over the byte bound", () => {
  const issues = validateMetadata({ blob: "x".repeat(MAX_METADATA_BYTES) })
  assert.ok(issues.length > 0)
})

test("well-formed metadata passes clean", () => {
  assert.deepEqual(validateMetadata({ count: 3, ok: true, label: "hello", empty: null }), [])
})

test("ExperienceValidationError carries the issue list", () => {
  const error = new ExperienceValidationError(["a", "b"])
  assert.deepEqual(error.issues, ["a", "b"])
  assert.match(error.message, /a; b/)
})
