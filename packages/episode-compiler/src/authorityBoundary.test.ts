import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import * as episodeCompiler from "./index.ts"

// Narrow, package-local static guard (mirroring narrative-interpretation's
// own precedent, STK-WO-009 Phase A section 13 / Phase E section 6/19-22).
// Not a monorepo-wide scanner -- it exists only to prove this one package
// is the governed Episode Compiler boundary: CertifiedInterpretation-only
// input, no World access, no World mutation, no runtime execution, no
// production/distribution authority, no legacy-Episode-representation
// reuse, no Scene/Beat/Encounter/NarrativeEntity semantic authority.
const FORBIDDEN_EXPORT_NAME_FRAGMENTS = [
  "commitworld",
  "worldevent",
  "authorizevisitor",
  "publishexperience",
  "executeepisode",
  "narrativeentity",
  "encounter",
  "season",
  "scene",
  "beat",
  "writerepisode",
  "streamk",
  "cinemak",
]

// episode-compiler's one sanctioned dependency is @avatark/narrative-interpretation
// -- nothing else. Every one of these must be absent from every own source
// file's imports.
const FORBIDDEN_IMPORT_FRAGMENTS = [
  "narrative-runtime",
  "narrative-ir-adapter",
  "world-memory",
  "world-persistence",
  "world-adaptation",
  "world-embodiment",
  "world-experience",
  "canonical-event",
  "living-world",
  "living-systems",
  "story-twin",
  "storytwin",
  "streamk",
  "cinemak",
  "openai",
  "anthropic",
]

const OWN_SOURCE_FILES = ["index.ts", "types.ts", "validation.ts", "compile.ts"]

test("T1: the package's public exports contain no World-mutation, runtime-execution, or legacy-Episode-authority surface", () => {
  const exportNames = Object.keys(episodeCompiler)
  for (const name of exportNames) {
    const lowered = name.toLowerCase()
    for (const forbidden of FORBIDDEN_EXPORT_NAME_FRAGMENTS) {
      assert.ok(!lowered.includes(forbidden), `export "${name}" must not reference forbidden concept "${forbidden}"`)
    }
  }
})

test("T2: the package declares exactly one runtime dependency (@avatark/narrative-interpretation) -- nothing broader", () => {
  const packageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url))
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as Record<string, unknown>
  assert.deepStrictEqual(Object.keys(packageJson.dependencies as Record<string, unknown>), ["@avatark/narrative-interpretation"])
})

test("T3: no own source file (code, not explanatory comments) imports Lane-1, narrative-ir-adapter, narrative-runtime, World-mutation/runtime packages, Writer/Story-Twin/CinemaK/StreamK, or any LLM/model client", () => {
  for (const file of OWN_SOURCE_FILES) {
    const codeOnly = readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
    for (const fragment of FORBIDDEN_IMPORT_FRAGMENTS) {
      assert.ok(!codeOnly.includes(fragment), `${file} must not reference "${fragment}"`)
    }
  }
})

test("T4: the one sanctioned dependency's own dependency graph still cannot transitively reach a World-mutation or narrative-runtime API", () => {
  const niPackageJsonPath = fileURLToPath(new URL("../../narrative-interpretation/package.json", import.meta.url))
  const niPackageJson = JSON.parse(readFileSync(niPackageJsonPath, "utf8")) as Record<string, unknown>
  assert.deepStrictEqual(Object.keys(niPackageJson.dependencies as Record<string, unknown>), ["@avatark/narrative-ir-adapter"])
})

test("T5: compile.ts (code only) never invokes certification -- the Episode Compiler consumes an already-produced CertifiedInterpretation and never certifies one itself", () => {
  const codeOnly = readFileSync(fileURLToPath(new URL("./compile.ts", import.meta.url)), "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
  assert.ok(!codeOnly.includes("certifyInterpretationCandidate"))
})

test("T6: no own source file introduces Scene/Beat/Encounter/NarrativeEntity as a local type or value (code only)", () => {
  const FORBIDDEN_TYPE_NAMES = ["interface Scene", "interface Beat", "interface Encounter", "interface NarrativeEntity", "type Scene", "type Beat", "type Encounter", "type NarrativeEntity"]
  for (const file of OWN_SOURCE_FILES) {
    const codeOnly = readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
    for (const forbidden of FORBIDDEN_TYPE_NAMES) {
      assert.ok(!codeOnly.includes(forbidden), `${file} must not declare "${forbidden}"`)
    }
  }
})

test("T7: no own source file introduces a Phase-F Episode Candidate type -- Phase E's output is explicitly a foundation, never named or shaped as a candidate", () => {
  for (const file of OWN_SOURCE_FILES) {
    const codeOnly = readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
    assert.ok(!codeOnly.includes("EpisodeCandidate"), `${file} must not declare an EpisodeCandidate type -- that is Phase F's contract`)
  }
})
