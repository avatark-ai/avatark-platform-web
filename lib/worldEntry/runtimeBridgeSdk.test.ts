// WORLDK-M14-B2: the Platform side of the SDK boundary. The package's op
// vocabulary must be exactly the Runtime Ingress's; the Platform never imports
// lifecycle authority from the package (the package has none to give).
import { test } from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { RUNTIME_OPS as SDK_OPS } from "@avatark/runtime-bridge"
import { RUNTIME_OPS } from "./runtimeIngress.ts"

const here = path.dirname(fileURLToPath(import.meta.url))

test("parity: @avatark/runtime-bridge speaks exactly the Runtime Ingress operations", () => {
  assert.deepEqual([...SDK_OPS], [...RUNTIME_OPS])
})

test("placement: only the reference runtime (a renderer adapter) and tests consume the SDK; no authority module does", () => {
  for (const f of readdirSync(here).filter((x) => x.endsWith(".ts") && !x.endsWith(".test.ts"))) {
    const uses = /from\s+"@avatark\/runtime-bridge"/.test(readFileSync(path.join(here, f), "utf8"))
    assert.equal(uses, f === "referenceRuntime.ts", f)
  }
})
