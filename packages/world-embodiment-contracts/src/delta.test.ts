import { test } from "node:test"
import assert from "node:assert/strict"
import type { EmbodimentDeltaEntry, WorldEmbodimentDelta } from "./delta.ts"

test("WorldEmbodimentDelta and its entries are satisfiable by plain object literals for all four ops", () => {
  const entries: EmbodimentDeltaEntry[] = [
    { path: "entity:e1", op: "ADD", after: { visible: true } },
    { path: "region:yamuna.environment", op: "UPDATE", before: { semantic: "still" }, after: { semantic: "flowing" } },
    { path: "entity:e2", op: "REMOVE", before: { visible: true } },
    { path: "region:vrindavan-entry.environment", op: "UNCHANGED" },
  ]
  const delta: WorldEmbodimentDelta = { worldId: "living-vrindavan", fromTick: 0, toTick: 4, entries }
  assert.equal(delta.entries.length, 4)
  assert.deepEqual(delta.entries.map((e) => e.op), ["ADD", "UPDATE", "REMOVE", "UNCHANGED"])
})
