import { test } from "node:test"
import assert from "node:assert/strict"
import { emptyReturnRecognition } from "./returnRecognition.ts"

test("emptyReturnRecognition is an honest zero-facts result, never a fabricated one", () => {
  const result = emptyReturnRecognition("living-vrindavan", "visitor-1", 10, 10)
  assert.deepEqual(result.facts, [])
  assert.equal(result.sinceTick, 10)
  assert.equal(result.currentTick, 10)
})
