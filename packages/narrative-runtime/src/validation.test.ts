import test from "node:test"
import assert from "node:assert/strict"
import { validateNarrativeDefinition } from "./validation.ts"
import { createNarrativeRuntime } from "./runtime.ts"
import { createInMemoryNarrativeRepository } from "./inMemoryRepository.ts"
import { NarrativeDefinitionError } from "./errors.ts"
import { buildLinearDefinition } from "./testFixtures.ts"
import type { NarrativeDefinition } from "./types.ts"

test("a well-formed definition validates clean", () => {
  const result = validateNarrativeDefinition(buildLinearDefinition())
  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
})

test("rejects a definition with no seasons", () => {
  const definition: NarrativeDefinition = { id: "empty", version: 1, title: "Empty", entrySeasonId: "s1", seasons: [] }
  const result = validateNarrativeDefinition(definition)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes("at least one season")))
})

test("rejects an entrySeasonId that does not match any season", () => {
  const definition = buildLinearDefinition()
  definition.entrySeasonId = "does-not-exist"
  const result = validateNarrativeDefinition(definition)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('entrySeasonId "does-not-exist"')))
})

test("rejects a narration beat whose next transition targets a nonexistent beat", () => {
  const definition = buildLinearDefinition()
  definition.seasons[0].episodes[0].scenes[0].beats[0] = {
    id: "b1",
    kind: "narration",
    next: { to: "beat", beatId: "does-not-exist" },
  }
  const result = validateNarrativeDefinition(definition)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('Narration beat "b1"')))
})

test("rejects duplicate beat ids across different scenes", () => {
  const definition = buildLinearDefinition()
  // sc2's only beat reuses sc1's "b1" id.
  definition.seasons[0].episodes[0].scenes[1].beats[0] = { id: "b1", kind: "narration", next: { to: "end" } }
  const result = validateNarrativeDefinition(definition)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('Duplicate beat id "b1"')))
})

test("rejects a scene whose entryBeatId does not match one of its own beats", () => {
  const definition = buildLinearDefinition()
  definition.seasons[0].episodes[0].scenes[0].entryBeatId = "does-not-exist"
  const result = validateNarrativeDefinition(definition)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('Scene "sc1"')))
})

test("rejects a choice beat with zero choices", () => {
  const definition = buildLinearDefinition()
  definition.seasons[0].episodes[0].scenes[0].beats[0] = { id: "b1", kind: "choice", choices: [] }
  const result = validateNarrativeDefinition(definition)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('Choice beat "b1"')))
})

test("createNarrativeRuntime refuses to construct against a malformed definition", () => {
  const definition = buildLinearDefinition()
  definition.entrySeasonId = "does-not-exist"
  assert.throws(
    () => createNarrativeRuntime({ definition, repository: createInMemoryNarrativeRepository() }),
    NarrativeDefinitionError
  )
})
