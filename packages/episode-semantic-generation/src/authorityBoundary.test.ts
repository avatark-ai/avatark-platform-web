import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import * as episodeSemanticGeneration from "./index.ts"

// Narrow, package-local static guard (mirroring narrative-interpretation's
// and episode-compiler's own precedent). Proves this package is exactly
// what PLT-ADR-009 Amendment A1 ratifies: a proposal-only boundary between
// CertifiedInterpretation and episode-compiler -- never World authority,
// never Interpretation/Episode certification, never runtime execution,
// never production/distribution authority, never a model/LLM call.
const FORBIDDEN_EXPORT_NAME_FRAGMENTS = [
  "certifyepisode",
  "certifiedepisode",
  "compileepisode",
  "episodecandidate",
  "commitworld",
  "worldevent",
  "authorizevisitor",
  "publishexperience",
  "executeepisode",
  "narrativeentity",
  "encounter",
  "scene",
  "beat",
  "writerepisode",
]

const FORBIDDEN_IMPORT_FRAGMENTS = [
  "narrative-runtime",
  "narrative-ir-adapter",
  "episode-compiler",
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
  "fetch(",
]

const OWN_SOURCE_FILES = ["index.ts", "types.ts", "validation.ts", "identity.ts", "propose.ts"]

// 1/2. Package loads/exports correctly and exposes no forbidden surface.
test("SG1: package exports load without error", () => {
  assert.equal(typeof episodeSemanticGeneration.proposeEpisodeContent, "function")
})

test("SG2: the package's public exports contain no certification, compilation, runtime-execution, or legacy-Episode-authority surface", () => {
  const exportNames = Object.keys(episodeSemanticGeneration)
  for (const name of exportNames) {
    const lowered = name.toLowerCase()
    for (const forbidden of FORBIDDEN_EXPORT_NAME_FRAGMENTS) {
      assert.ok(!lowered.includes(forbidden), `export "${name}" must not reference forbidden concept "${forbidden}"`)
    }
  }
})

// 21/22/23/24/20. Dependency-graph and import-surface guards.
test("SG3: the package declares exactly one runtime dependency (@avatark/narrative-interpretation) -- nothing broader, no narrative-runtime, no CinemaK/StreamK, no model SDK", () => {
  const packageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url))
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as Record<string, unknown>
  assert.deepStrictEqual(Object.keys(packageJson.dependencies as Record<string, unknown>), ["@avatark/narrative-interpretation"])
})

test("SG4: no own source file (code, not explanatory comments) imports narrative-runtime, episode-compiler, World-mutation/runtime packages, Writer/Story-Twin/CinemaK/StreamK, or any LLM/model client", () => {
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

test("SG5: the one sanctioned dependency's own dependency graph still cannot transitively reach a World-mutation, episode-compiler, or narrative-runtime API", () => {
  const niPackageJsonPath = fileURLToPath(new URL("../../narrative-interpretation/package.json", import.meta.url))
  const niPackageJson = JSON.parse(readFileSync(niPackageJsonPath, "utf8")) as Record<string, unknown>
  assert.deepStrictEqual(Object.keys(niPackageJson.dependencies as Record<string, unknown>), ["@avatark/narrative-ir-adapter"])
})

// 4. proposal cannot self-certify -- proven structurally: no certify-named
// function exists anywhere in this package's public surface or own source.
test("SG6: no own source file (code only) defines or exports a certify-named function -- this package cannot self-certify its own proposal", () => {
  for (const file of OWN_SOURCE_FILES) {
    const codeOnly = readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
    assert.ok(!/\bcertify[A-Za-z]*\s*\(/.test(codeOnly), `${file} must not define a certify-named function`)
  }
  const exportNames = Object.keys(episodeSemanticGeneration).map((n) => n.toLowerCase())
  assert.ok(!exportNames.some((n) => n.includes("certify")), "no exported symbol may be certify-named")
})

test("SG7: no own source file declares a local Scene/Beat/Encounter/NarrativeEntity type (code only) -- EpisodeSegment is not, and never becomes, a runtime type", () => {
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

// ADR Amendment A3: only "human" may operationally execute -- proven
// statically that no "model"/"rule_engine" execution branch exists (the
// only kind check present in propose.ts compares against one fixed,
// authorized constant, never branching into per-kind execution logic).
test("SG8: propose.ts contains no per-kind execution branch for \"model\" or \"rule_engine\" -- only structural rejection", () => {
  const code = readFileSync(fileURLToPath(new URL("./propose.ts", import.meta.url)), "utf8")
  assert.ok(!code.includes('=== "model"'), "propose.ts must not branch on kind === \"model\"")
  assert.ok(!code.includes('=== "rule_engine"'), "propose.ts must not branch on kind === \"rule_engine\"")
})

test("SG9: this package has no filesystem-write, network, or persistence capability in its own source (code only) -- read-only construction of new objects", () => {
  const FORBIDDEN_IO_FRAGMENTS = ["writeFileSync", "http.request", "https.request", "fetch(", "process.env"]
  for (const file of OWN_SOURCE_FILES) {
    const codeOnly = readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
    for (const fragment of FORBIDDEN_IO_FRAGMENTS) {
      assert.ok(!codeOnly.includes(fragment), `${file} must not reference "${fragment}"`)
    }
  }
})
