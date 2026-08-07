import test from "node:test"
import assert from "node:assert/strict"
import { createNarrativeRuntime } from "./runtime.ts"
import { createInMemoryNarrativeRepository } from "./inMemoryRepository.ts"
import { renderNarrativeView } from "./viewer.ts"
import { buildBranchingDefinition } from "./testFixtures.ts"

test("renders the available choices for a choice beat", async () => {
  const repository = createInMemoryNarrativeRepository()
  const runtime = createNarrativeRuntime({ definition: buildBranchingDefinition(), repository })

  await runtime.startNarrative("user-1")
  const next = await runtime.getNext("user-1")
  const lines = renderNarrativeView(next)

  assert.equal(lines[0].kind, "choice-prompt")
  assert.ok(lines.some((l) => l.kind === "choice-option" && l.text.includes("Do the good thing")))
})

test("renders a completed narrative distinctly", async () => {
  const repository = createInMemoryNarrativeRepository()
  const runtime = createNarrativeRuntime({ definition: buildBranchingDefinition(), repository })

  await runtime.startNarrative("user-1")
  await runtime.choose("user-1", "choice-good")
  await runtime.completeBeat("user-1")
  await runtime.trigger("user-1", "trig-good-path")

  const next = await runtime.getNext("user-1")
  const lines = renderNarrativeView(next)
  assert.deepEqual(lines, [{ kind: "completed", text: "This narrative is complete." }])
})
