// WORLDK-M13: Preview Lifecycle Harness guards (no database needed).
import { test } from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  assertLifecycleTarget,
  classifyLifecycleError,
  FORBIDDEN_PROJECT_REFS,
  LifecycleFailure,
  PREVIEW_PROJECT_REF,
  previewProvenance,
} from "./testing/previewLifecycleHarness.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, "../..")
const refused = (fn: () => void) => assert.throws(fn, (e: unknown) => e instanceof LifecycleFailure && e.code === "TARGET_REFUSED")
const pooler = "aws-0-us-east-1.pooler.supabase.com"

test("target guard: only avatark-platform-preview via the lifecycle credential is accepted", () => {
  assert.doesNotThrow(() => assertLifecycleTarget({ host: pooler, user: `worldk_lifecycle_harness_preview.${PREVIEW_PROJECT_REF}`, projectRef: PREVIEW_PROJECT_REF }))
  assert.doesNotThrow(() => assertLifecycleTarget({ host: `db.${PREVIEW_PROJECT_REF}.supabase.co`, user: "worldk_lifecycle_harness_preview", projectRef: PREVIEW_PROJECT_REF }))
})

test("target guard: every production/forbidden project is refused, however it is named", () => {
  for (const ref of FORBIDDEN_PROJECT_REFS) {
    refused(() => assertLifecycleTarget({ host: pooler, user: `worldk_lifecycle_harness_preview.${ref}`, projectRef: ref }))
    refused(() => assertLifecycleTarget({ host: `db.${ref}.supabase.co`, user: "worldk_lifecycle_harness_preview", projectRef: PREVIEW_PROJECT_REF }))
    refused(() => assertLifecycleTarget({ host: pooler, user: `worldk_lifecycle_harness_preview.${PREVIEW_PROJECT_REF}`, projectRef: ref }))
  }
  assert.ok(FORBIDDEN_PROJECT_REFS.includes("hapoerzbcnagyfafqojg" as never), "avatark-platform-test (production) must be forbidden")
})

test("target guard: unknown projects, mismatched connections, other roles and unflagged local targets are refused", () => {
  refused(() => assertLifecycleTarget({ host: pooler, user: "worldk_lifecycle_harness_preview.someotherref", projectRef: "someotherref" }))
  refused(() => assertLifecycleTarget({ host: pooler, user: "worldk_lifecycle_harness_preview.someotherref", projectRef: PREVIEW_PROJECT_REF }))
  refused(() => assertLifecycleTarget({ host: pooler, user: `postgres.${PREVIEW_PROJECT_REF}`, projectRef: PREVIEW_PROJECT_REF }))
  refused(() => assertLifecycleTarget({ host: pooler, user: `service_role.${PREVIEW_PROJECT_REF}`, projectRef: PREVIEW_PROJECT_REF }))
  refused(() => assertLifecycleTarget({ host: "127.0.0.1", user: "worldk_lifecycle_harness_preview", projectRef: PREVIEW_PROJECT_REF }))
  assert.doesNotThrow(() => assertLifecycleTarget({ host: "127.0.0.1", user: "x", projectRef: "local" }, { allowLocalDisposable: true }))
})

test("provenance is explicitly a Preview authority simulation, never a runtime receipt or WorldEntry", () => {
  const p = previewProvenance()
  assert.equal(p.classification, "PREVIEW_AUTHORITY_SIMULATION")
  assert.equal(p.runtimeReceipt, false)
  assert.equal(p.worldEntry, false)
  assert.notEqual(previewProvenance().receiptId, p.receiptId)
})

test("error classification is deterministic", () => {
  for (const code of ["VISIT_ALREADY_OPEN", "VISIT_MISMATCH", "NO_OPEN_VISIT", "EVENT_ID_CONFLICT", "WORLD_NOT_ALLOWED", "SUBJECT_INVALID", "AUTHORITY_INVALID", "TIME_OUT_OF_BOUNDS"]) {
    assert.equal(classifyLifecycleError({ code: "P0001", message: code }).code, code)
  }
  assert.equal(classifyLifecycleError({ code: "42501", message: "permission denied for function record_world_lifecycle_arrival_v2" }).code, "PERMISSION_DENIED")
  assert.throws(() => classifyLifecycleError(new Error("connection reset")))
})

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) out.push(p)
  }
  return out
}

test("the harness is reachable from no app route, page, proxy or producer — only tests and the operator script", () => {
  const importers = [...walk(path.join(root, "app")), ...walk(path.join(root, "lib")), ...walk(path.join(root, "packages")), path.join(root, "proxy.ts")]
    .filter((f) => !/\.test\.tsx?$/.test(f) && !f.endsWith("previewLifecycleHarness.ts"))
    .filter((f) => /previewLifecycleHarness|record_world_lifecycle_(arrival|departure)_v2|worldk_lifecycle_(authority|harness_preview)/.test(readFileSync(f, "utf8")))
  assert.deepEqual(importers.map((f) => path.relative(root, f)), [])
})
