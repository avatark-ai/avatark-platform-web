import { test } from "node:test"
import assert from "node:assert/strict"
import { freshNeedStates } from "./needs.ts"
import type { NeedDefinition } from "./needs.ts"

const DEFINITIONS: NeedDefinition[] = [
  { dimension: "hunger", baselinePressurePerTick: 0.05, thresholds: { urgentAbove: 0.8 } },
  { dimension: "thirst", baselinePressurePerTick: 0.08, thresholds: { urgentAbove: 0.8 } },
]

test("freshNeedStates seeds every tracked dimension at zero pressure, fully satisfied", () => {
  const states = freshNeedStates(DEFINITIONS)
  assert.deepEqual(states, [
    { dimension: "hunger", pressure: 0 },
    { dimension: "thirst", pressure: 0 },
  ])
})

test("freshNeedStates never invents a dimension the profile didn't define", () => {
  const states = freshNeedStates(DEFINITIONS)
  assert.equal(states.length, DEFINITIONS.length)
})
