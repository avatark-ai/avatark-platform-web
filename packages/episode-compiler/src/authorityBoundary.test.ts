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

const OWN_SOURCE_FILES = [
  "index.ts",
  "types.ts",
  "validation.ts",
  "compile.ts",
  "episodeCandidate.ts",
  "episodeCertify.ts",
  "proposalValidation.ts",
  "episodeCandidateContent.ts",
  "episodeCertifyContent.ts",
  "runtimeProjectability.ts",
]

test("T1: the package's public exports contain no World-mutation, runtime-execution, or legacy-Episode-authority surface", () => {
  const exportNames = Object.keys(episodeCompiler)
  for (const name of exportNames) {
    const lowered = name.toLowerCase()
    for (const forbidden of FORBIDDEN_EXPORT_NAME_FRAGMENTS) {
      assert.ok(!lowered.includes(forbidden), `export "${name}" must not reference forbidden concept "${forbidden}"`)
    }
  }
})

// STK-WO-009 Stage 3 (G10D-5): the PLT-ADR-009 amendment ratifies exactly
// one new sanctioned dependency for this package --
// @avatark/episode-semantic-generation, the proposal-only boundary this
// package consumes. Nothing broader was added alongside it.
test("T2: the package declares exactly its two ratified runtime dependencies (@avatark/narrative-interpretation, @avatark/episode-semantic-generation) -- nothing broader", () => {
  const packageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url))
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as Record<string, unknown>
  assert.deepStrictEqual(Object.keys(packageJson.dependencies as Record<string, unknown>), ["@avatark/narrative-interpretation", "@avatark/episode-semantic-generation"])
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

test("T4: the narrative-interpretation dependency's own dependency graph still cannot transitively reach a World-mutation or narrative-runtime API", () => {
  const niPackageJsonPath = fileURLToPath(new URL("../../narrative-interpretation/package.json", import.meta.url))
  const niPackageJson = JSON.parse(readFileSync(niPackageJsonPath, "utf8")) as Record<string, unknown>
  assert.deepStrictEqual(Object.keys(niPackageJson.dependencies as Record<string, unknown>), ["@avatark/narrative-ir-adapter"])
})

test("T4b: the episode-semantic-generation dependency's own dependency graph still cannot transitively reach narrative-runtime, CinemaK, StreamK, or a model SDK", () => {
  const esgPackageJsonPath = fileURLToPath(new URL("../../episode-semantic-generation/package.json", import.meta.url))
  const esgPackageJson = JSON.parse(readFileSync(esgPackageJsonPath, "utf8")) as Record<string, unknown>
  assert.deepStrictEqual(Object.keys(esgPackageJson.dependencies as Record<string, unknown>), ["@avatark/narrative-interpretation"])
})

test("T5: compile.ts and episodeCandidate.ts (code only) never invoke Interpretation certification -- the Episode Compiler consumes an already-produced CertifiedInterpretation and never certifies one itself", () => {
  for (const file of ["compile.ts", "episodeCandidate.ts"]) {
    const codeOnly = readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
    assert.ok(!codeOnly.includes("certifyInterpretationCandidate"), `${file} must not invoke Interpretation certification`)
  }
})

// STK-WO-009 Phase F (G10D-2): derive(...) != certify(...) at the Episode
// stage too, mirroring Phase D's own mandatory invariant one stage
// downstream.
test("T5b: episodeCandidate.ts and compile.ts (code only) never reference the Episode certifier -- the candidate/foundation derivation paths must never self-certify", () => {
  for (const file of ["episodeCandidate.ts", "compile.ts"]) {
    const codeOnly = readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), "utf8")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n")
    assert.ok(!codeOnly.includes("certifyEpisodeCandidate"), `${file} must not reference the Episode certifier`)
  }
})

test("T5c: certifyEpisodeCandidate and compileEpisodeCandidate are distinct functions -- the public API never aliases Candidate derivation as Certified promotion", () => {
  assert.notEqual(episodeCompiler.certifyEpisodeCandidate, episodeCompiler.compileEpisodeCandidate)
  assert.equal(typeof episodeCompiler.certifyEpisodeCandidate, "function")
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

// STK-WO-009 Phase F (G10D-2): EpisodeCandidate is now the real, governed
// contract this Work Order's own Phase F exit criteria requires -- the
// Phase-E-era guard that it must not exist is superseded, not weakened
// (the field this test now proves is the section 9 disposition decision:
// Foundation and Candidate are independent siblings over the same
// CertifiedInterpretation input, never a pipeline where one feeds the
// other).
test("T7: compile.ts (Foundation) and episodeCandidate.ts (Candidate) never import each other -- both derive independently from CertifiedInterpretation, neither is the other's input", () => {
  const compileCode = readFileSync(fileURLToPath(new URL("./compile.ts", import.meta.url)), "utf8")
  const candidateCode = readFileSync(fileURLToPath(new URL("./episodeCandidate.ts", import.meta.url)), "utf8")
  assert.ok(!compileCode.includes("episodeCandidate.ts"))
  assert.ok(!candidateCode.includes("./compile.ts"))
})

test("T8: CertifiedEpisode is never aliased to or confused with CertifiedInterpretation -- distinct types, distinct certification authority/policy identities", () => {
  assert.notDeepStrictEqual(episodeCompiler.EPISODE_CERTIFICATION_AUTHORITY_IDENTITY, { name: "narrative-interpretation-certification", version: "0.1.0" })
  assert.notDeepStrictEqual(episodeCompiler.EPISODE_CERTIFICATION_POLICY_IDENTITY, { name: "structural-provenance-identity-policy", version: "1" })
})
