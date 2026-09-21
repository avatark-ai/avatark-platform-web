import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import * as narrativeInterpretation from "./index.ts"

// Narrow, package-local static guard (STK-WO-009 Phase A, section 13). This
// is not a monorepo-wide scanner -- it exists only to prove that this one
// package is a derived interpretation boundary, never a World-mutation,
// Episode-compiler, or Episode-semantic-authority surface.
const FORBIDDEN_EXPORT_NAME_FRAGMENTS = [
  "compileepisode",
  "episodecompiler",
  "commitworld",
  "worldevent",
  "authorizevisitor",
  "publishexperience",
  "narrativeentity",
  "encounter",
  "season",
  "scene",
  "beat",
  "writerepisode",
]

const FORBIDDEN_IMPORT_FRAGMENTS = [
  "narrative-runtime",
  "narrative-ir-adapter",
  "world-memory",
  "world-persistence",
  "world-adaptation",
  "world-embodiment",
  "world-experience",
  "canonical-event",
  "episode-compiler",
]

const OWN_SOURCE_FILES = ["index.ts", "types.ts", "errors.ts", "validation.ts", "provenance.ts", "interpret.ts"]

test("T16: the package's public exports contain no World-mutation, Episode-compiler, or Episode-semantic-authority surface", () => {
  const exportNames = Object.keys(narrativeInterpretation)
  for (const name of exportNames) {
    const lowered = name.toLowerCase()
    for (const forbidden of FORBIDDEN_EXPORT_NAME_FRAGMENTS) {
      assert.ok(!lowered.includes(forbidden), `export "${name}" must not reference forbidden concept "${forbidden}"`)
    }
  }
})

test("T17: the package declares zero runtime dependencies -- it cannot transitively reach a World-mutation or Episode-compiler API", () => {
  const packageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url))
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as Record<string, unknown>
  assert.equal(packageJson.dependencies, undefined)
})

test("T18: no own source file imports from narrative-runtime, narrative-ir-adapter, or any World-mutation/persistence package", () => {
  for (const file of OWN_SOURCE_FILES) {
    const contents = readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), "utf8")
    for (const fragment of FORBIDDEN_IMPORT_FRAGMENTS) {
      assert.ok(!contents.includes(fragment), `${file} must not reference "${fragment}"`)
    }
  }
})
