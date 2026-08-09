import assert from "node:assert/strict"
import { test } from "node:test"
import type { PrivateReflectionRecordRepository } from "./privateReflection.ts"

test("PrivateReflectionRecordRepository exposes no world-wide or cross-user read method -- only append and listByOwner", () => {
  const methods: (keyof PrivateReflectionRecordRepository)[] = ["append", "listByOwner"]
  assert.deepEqual(new Set(methods), new Set(["append", "listByOwner"]))
})
