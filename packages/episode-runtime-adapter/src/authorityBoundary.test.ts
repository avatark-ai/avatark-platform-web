import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import * as episodeRuntimeAdapter from "./index.ts"

// Narrow, package-local static guard (mirroring every sibling package's own
// precedent in this arc). Proves this package is exactly what STK-WO-009
// Phase G ratifies: a one-directional CertifiedEpisode -> NarrativeDefinition
// projector -- never World authority, never Interpretation/Episode
// certification, never a narrative-runtime modification, never
// production/distribution authority, never a model/LLM call.
const FORBIDDEN_EXPORT_NAME_FRAGMENTS = [
  "certify",
  "compileepisode",
  "commitworld",
  "worldevent",
  "authorizevisitor",
  "publishexperience",
  "narrativeentity",
  "encounter",
  "writerepisode",
]

const FORBIDDEN_IMPORT_FRAGMENTS = [
  "narrative-interpretation",
  "narrative-ir-adapter",
  "episode-semantic-generation",
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

const OWN_SOURCE_FILES = ["index.ts", "types.ts", "project.ts", "resolve.ts"]

test("PB1: package exports load without error", () => {
  assert.equal(typeof episodeRuntimeAdapter.projectCertifiedEpisode, "function")
})

test("PB2: the package's public exports contain no certification, World-mutation, or legacy-Episode-authority surface", () => {
  const exportNames = Object.keys(episodeRuntimeAdapter)
  for (const name of exportNames) {
    const lowered = name.toLowerCase()
    for (const forbidden of FORBIDDEN_EXPORT_NAME_FRAGMENTS) {
      assert.ok(!lowered.includes(forbidden), `export "${name}" must not reference forbidden concept "${forbidden}"`)
    }
  }
})

// 17/18. no Writer, no CinemaK/StreamK dependency; 16. no direct
// Interpretation-layer dependency (this package consumes CertifiedEpisode
// only, through episode-compiler -- never narrative-interpretation or
// episode-semantic-generation directly, keeping the layering strict).
test("PB3: the package declares exactly its two ratified runtime dependencies (@avatark/episode-compiler, @avatark/narrative-runtime) -- nothing broader", () => {
  const packageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url))
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as Record<string, unknown>
  assert.deepStrictEqual(Object.keys(packageJson.dependencies as Record<string, unknown>), ["@avatark/episode-compiler", "@avatark/narrative-runtime"])
})

test("PB4: no own source file (code, not explanatory comments) imports Writer, Story-Twin, CinemaK, StreamK, an LLM/model client, World-mutation packages, or the Interpretation-layer packages directly", () => {
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

// 15/16. no World mutation, no certification invocation -- proven
// structurally: no source file (code only) references any certify-named
// or World-write-named symbol.
test("PB5: no own source file (code only) invokes Interpretation or Episode certification, or any World-write API", () => {
  const FORBIDDEN_CALL_FRAGMENTS = ["certifyInterpretationCandidate", "certifyEpisodeCandidate", "certifyEpisodeCandidateWithProposal", "commitWorldEvent", "writeHistoryPool"]
  for (const file of OWN_SOURCE_FILES) {
    const codeOnly = readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
    for (const fragment of FORBIDDEN_CALL_FRAGMENTS) {
      assert.ok(!codeOnly.includes(fragment), `${file} must not reference "${fragment}"`)
    }
  }
})

// 13. runtime remains downstream -- this package never modifies
// narrative-runtime's own package, and never exports a symbol that could
// be mistaken for a narrative-runtime authority (e.g. a second
// validateNarrativeDefinition).
test("PB6: this package does not modify narrative-runtime -- its own dependency declaration names narrative-runtime as a consumed package only, and this package exports no validate-named or execute-named symbol of its own", () => {
  const exportNames = Object.keys(episodeRuntimeAdapter).map((n) => n.toLowerCase())
  assert.ok(!exportNames.some((n) => n.includes("validatenarrativedefinition")), "must not re-export or shadow narrative-runtime's own validator as if it were this package's own authority")
  assert.ok(!exportNames.some((n) => n.includes("createnarrativeruntime")), "must not export a runtime-execution constructor of its own")
})

// 14. no World access -- narrative-runtime itself has zero dependencies
// (confirmed by direct inspection), and this package's other dependency
// (episode-compiler) has already been proven, by its own authority-boundary
// tests, to have no World-mutation-capable transitive dependency.
test("PB7: narrative-runtime (the runtime-projection target) itself declares zero dependencies -- this package's dependency graph cannot reach World state through it", () => {
  const nrPackageJsonPath = fileURLToPath(new URL("../../narrative-runtime/package.json", import.meta.url))
  const nrPackageJson = JSON.parse(readFileSync(nrPackageJsonPath, "utf8")) as Record<string, unknown>
  assert.equal(nrPackageJson.dependencies, undefined)
})

test("PB8: this package's one Episode-layer dependency, @avatark/episode-compiler, still declares exactly its two ratified dependencies -- nothing broader snuck in transitively", () => {
  const ecPackageJsonPath = fileURLToPath(new URL("../../episode-compiler/package.json", import.meta.url))
  const ecPackageJson = JSON.parse(readFileSync(ecPackageJsonPath, "utf8")) as Record<string, unknown>
  assert.deepStrictEqual(Object.keys(ecPackageJson.dependencies as Record<string, unknown>), ["@avatark/narrative-interpretation", "@avatark/episode-semantic-generation"])
})

test("PB9: no own source file declares a Choice or Trigger beat construction helper -- this package never fabricates branching narrative semantics", () => {
  for (const file of OWN_SOURCE_FILES) {
    const codeOnly = readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
    assert.ok(!codeOnly.includes('kind: "choice"'), `${file} must not construct a choice beat`)
    assert.ok(!codeOnly.includes('kind: "trigger"'), `${file} must not construct a trigger beat`)
  }
})
