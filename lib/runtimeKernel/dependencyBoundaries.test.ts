import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// Sprint 3, Phase 10: static enforcement of the Runtime Kernel's
// dependency boundaries (docs/RUNTIME_KERNEL_ARCHITECTURE.md,
// docs/DEPENDENCY_GRAPH.md). Fails this test suite -- and therefore
// `pnpm test` / CI -- if any of these regress:
//
//   1. packages/runtime-contracts imports no runtime (and nothing else).
//   2. Runtime packages import @avatark/runtime-contracts at most --
//      never a sibling runtime, never @avatark/account.
//   3. Runtime packages never import @avatark/account.
//
// (Host code "may import runtimes + account" needs no enforcement here --
// nothing forbids it, so there's no regression to catch.)
//
// Sprint 6, Phase 9: the same enforcement for the renderer boundary --
// architectural invariants #4 ("Runtime Kernel contains no renderer
// dependency") and #11 ("Unreal renderer can be added without changing
// Runtime"). @avatark/renderer-contracts is allowed to depend on
// @avatark/runtime-contracts (for shared id types, one direction only);
// no runtime package, and not runtime-contracts itself, may ever import
// @avatark/renderer-contracts back.

const REPO_ROOT = join(import.meta.dirname, "..", "..")
const RUNTIME_PACKAGES = [
  "experience-runtime",
  "living-world-runtime",
  "narrative-runtime",
  "context-runtime",
  "experience-registry",
]
const CONTRACTS_PACKAGE = "runtime-contracts"
const RENDERER_CONTRACTS_PACKAGE = "renderer-contracts"
const LIVING_SYSTEMS_CONTRACTS_PACKAGE = "living-systems-contracts"
const LIVING_SYSTEMS_RUNTIME_PACKAGE = "living-systems-runtime"
const WORLD_EMBODIMENT_CONTRACTS_PACKAGE = "world-embodiment-contracts"
const WORLD_EMBODIMENT_RUNTIME_PACKAGE = "world-embodiment-runtime"

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue
      files.push(...listSourceFiles(fullPath))
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(fullPath)
    }
  }
  return files
}

function findAvatarkImports(filePath: string): string[] {
  const content = readFileSync(filePath, "utf-8")
  const matches = content.matchAll(/(?:^|\n)\s*import\s[^;]*?from\s+["']@avatark\/([a-z0-9-]+)["']/g)
  return [...matches].map((m) => m[1])
}

function packageDependencies(packageName: string): Record<string, string> {
  const pkgJsonPath = join(REPO_ROOT, "packages", packageName, "package.json")
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"))
  return pkgJson.dependencies ?? {}
}

test("packages/runtime-contracts has zero dependencies of any kind", () => {
  const deps = packageDependencies(CONTRACTS_PACKAGE)
  assert.deepEqual(deps, {}, "runtime-contracts/package.json must declare no dependencies at all")
})

test("packages/runtime-contracts imports no @avatark/* package anywhere in its source", () => {
  const srcDir = join(REPO_ROOT, "packages", CONTRACTS_PACKAGE, "src")
  const violations = listSourceFiles(srcDir).flatMap((file) =>
    findAvatarkImports(file).map((pkg) => `${file} imports @avatark/${pkg}`),
  )
  assert.deepEqual(violations, [])
})

for (const runtimePackage of RUNTIME_PACKAGES) {
  test(`${runtimePackage}'s package.json dependencies are, at most, @avatark/runtime-contracts`, () => {
    const deps = packageDependencies(runtimePackage)
    const declaredAvatarkDeps = Object.keys(deps)
    const disallowed = declaredAvatarkDeps.filter((name) => name !== "@avatark/runtime-contracts")
    assert.deepEqual(
      disallowed,
      [],
      `${runtimePackage} declares disallowed dependencies: ${disallowed.join(", ")}`,
    )
  })

  test(`${runtimePackage} never imports a sibling runtime or @avatark/account in its source`, () => {
    const srcDir = join(REPO_ROOT, "packages", runtimePackage, "src")
    const allowed = new Set([CONTRACTS_PACKAGE])
    const violations: string[] = []
    for (const file of listSourceFiles(srcDir)) {
      for (const importedPackage of findAvatarkImports(file)) {
        if (!allowed.has(importedPackage)) {
          violations.push(`${file} imports @avatark/${importedPackage}`)
        }
      }
    }
    assert.deepEqual(violations, [])
  })
}

test("packages/renderer-contracts declares, at most, a dependency on @avatark/runtime-contracts", () => {
  const deps = packageDependencies(RENDERER_CONTRACTS_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => name !== "@avatark/runtime-contracts")
  assert.deepEqual(disallowed, [], `renderer-contracts declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/renderer-contracts imports, at most, @avatark/runtime-contracts in its source -- never a runtime, never @avatark/account", () => {
  const srcDir = join(REPO_ROOT, "packages", RENDERER_CONTRACTS_PACKAGE, "src")
  const allowed = new Set([CONTRACTS_PACKAGE])
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) {
        violations.push(`${file} imports @avatark/${importedPackage}`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

// Sprint 7, Phase 9: the same enforcement for the Living Systems
// boundary -- architectural invariants #4 ("Runtime Kernel contains no
// renderer dependency," extended here to "no Living Systems dependency
// either -- the two are peers, not a hierarchy") and #10/#13 (no
// Unreal-specific types in core; the same runtime can support other
// Living Worlds). @avatark/living-systems-contracts may depend on
// @avatark/runtime-contracts only (mirrors renderer-contracts exactly);
// @avatark/living-systems-runtime may additionally depend on
// @avatark/living-systems-contracts. Neither may import a sibling
// RUNTIME_PACKAGE, @avatark/renderer-contracts, or @avatark/account --
// and no RUNTIME_PACKAGE may import either of these back (already
// covered by the generic loop above, since neither name is in that
// loop's own `allowed` set).

test("packages/living-systems-contracts declares, at most, a dependency on @avatark/runtime-contracts", () => {
  const deps = packageDependencies(LIVING_SYSTEMS_CONTRACTS_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => name !== "@avatark/runtime-contracts")
  assert.deepEqual(disallowed, [], `living-systems-contracts declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/living-systems-contracts imports, at most, @avatark/runtime-contracts in its source", () => {
  const srcDir = join(REPO_ROOT, "packages", LIVING_SYSTEMS_CONTRACTS_PACKAGE, "src")
  const allowed = new Set([CONTRACTS_PACKAGE])
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("packages/living-systems-runtime declares, at most, dependencies on @avatark/runtime-contracts and @avatark/living-systems-contracts", () => {
  const deps = packageDependencies(LIVING_SYSTEMS_RUNTIME_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => name !== "@avatark/runtime-contracts" && name !== "@avatark/living-systems-contracts")
  assert.deepEqual(disallowed, [], `living-systems-runtime declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/living-systems-runtime never imports a runtime, @avatark/renderer-contracts, or @avatark/account in its source", () => {
  const srcDir = join(REPO_ROOT, "packages", LIVING_SYSTEMS_RUNTIME_PACKAGE, "src")
  const allowed = new Set([CONTRACTS_PACKAGE, LIVING_SYSTEMS_CONTRACTS_PACKAGE])
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("packages/living-systems-runtime never calls a write method on protected narrative state -- static defense in depth alongside the type-level protection", () => {
  const srcDir = join(REPO_ROOT, "packages", LIVING_SYSTEMS_RUNTIME_PACKAGE, "src")
  const writeMethodPattern = /protectedNarrative\w*\.(save|put|set|write|mutate|update)\s*\(/i
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    if (file.endsWith(".test.ts")) continue
    const content = readFileSync(file, "utf-8")
    if (writeMethodPattern.test(content)) violations.push(file)
  }
  assert.deepEqual(violations, [])
})

// Sprint 8, Phase 20/23: the same enforcement one layer up, for the
// embodiment boundary -- invariants #5/#6 (no Unreal/Web-specific types
// in core) and #17 (existing Runtime Kernel boundaries remain intact).
// @avatark/world-embodiment-contracts may depend on runtime-contracts,
// renderer-contracts, and living-systems-contracts (reusing their shapes,
// per Sprint 8's own Phase 0 instruction); @avatark/world-embodiment-runtime
// may additionally depend on living-world-runtime (read-only input shapes,
// e.g. WorldLocation for spatial layout) and world-embodiment-contracts.
// Neither may be imported back by any RUNTIME_PACKAGE, runtime-contracts,
// renderer-contracts, or living-systems-contracts -- already guaranteed by
// each of those packages' own "imports at most X" tests above, since
// world-embodiment-* is never in any of their `allowed` sets.

const WORLD_EMBODIMENT_CONTRACTS_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/renderer-contracts", "@avatark/living-systems-contracts"])
const WORLD_EMBODIMENT_RUNTIME_ALLOWED_DEPS = new Set([
  "@avatark/runtime-contracts",
  "@avatark/renderer-contracts",
  "@avatark/living-systems-contracts",
  "@avatark/living-world-runtime",
  "@avatark/world-embodiment-contracts",
])

test("packages/world-embodiment-contracts declares, at most, dependencies on runtime-contracts/renderer-contracts/living-systems-contracts", () => {
  const deps = packageDependencies(WORLD_EMBODIMENT_CONTRACTS_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !WORLD_EMBODIMENT_CONTRACTS_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `world-embodiment-contracts declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/world-embodiment-contracts imports, at most, those same three packages in its source", () => {
  const srcDir = join(REPO_ROOT, "packages", WORLD_EMBODIMENT_CONTRACTS_PACKAGE, "src")
  const allowed = new Set(["runtime-contracts", "renderer-contracts", "living-systems-contracts"])
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("packages/world-embodiment-runtime declares, at most, dependencies on its five allowed packages", () => {
  const deps = packageDependencies(WORLD_EMBODIMENT_RUNTIME_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !WORLD_EMBODIMENT_RUNTIME_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `world-embodiment-runtime declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/world-embodiment-runtime imports, at most, those same five packages in its source -- never a sibling runtime, renderer, or @avatark/account", () => {
  const srcDir = join(REPO_ROOT, "packages", WORLD_EMBODIMENT_RUNTIME_PACKAGE, "src")
  const allowed = new Set(["runtime-contracts", "renderer-contracts", "living-systems-contracts", "living-world-runtime", "world-embodiment-contracts"])
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("neither world-embodiment package's source contains a React/Next.js/Unreal-specific token", () => {
  const forbidden = ["from \"react", "from 'react", "next/server", "next/navigation", "UObject", "AActor", "Blueprint", "UnrealEngine"]
  const violations: string[] = []
  for (const pkg of [WORLD_EMBODIMENT_CONTRACTS_PACKAGE, WORLD_EMBODIMENT_RUNTIME_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", pkg, "src")
    for (const file of listSourceFiles(srcDir)) {
      if (file.endsWith(".test.ts")) continue
      // Strip // line comments first -- this file's own documentation
      // legitimately NAMES these tokens when explaining that no such
      // reference exists in actual code; only real code usage should
      // fail this check.
      const code = readFileSync(file, "utf-8")
        .split("\n")
        .map((line) => line.replace(/\/\/.*$/, ""))
        .join("\n")
      for (const token of forbidden) {
        if (code.includes(token)) violations.push(`${file} contains "${token}"`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

// Sprint 9, Phase 0/21: the same enforcement one layer up again, for the
// durable-persistence boundary -- invariants #14 ("persistence remains
// renderer-neutral") and #15 ("persistence remains Unreal-neutral").
// @avatark/world-persistence-contracts may depend on runtime-contracts
// and living-systems-contracts only (reusing VisitorWorldMemory/
// ProtectedNarrativeProjection shapes, per its own Phase 1 instruction
// not to redefine what Sprint 7 already modeled); @avatark/world-
// persistence-runtime may additionally depend on living-systems-runtime
// (to call advanceWorldSimulation unmodified, per Phase 4) and world-
// persistence-contracts. Neither may ever depend on renderer-contracts,
// any world-embodiment-* package, or @avatark/account -- persistence is
// downstream of nothing renderer-shaped, and upstream of embodiment,
// never the reverse.

const WORLD_PERSISTENCE_CONTRACTS_PACKAGE = "world-persistence-contracts"
const WORLD_PERSISTENCE_RUNTIME_PACKAGE = "world-persistence-runtime"
const WORLD_PERSISTENCE_CONTRACTS_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/living-systems-contracts"])
const WORLD_PERSISTENCE_RUNTIME_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/living-systems-contracts", "@avatark/living-systems-runtime", "@avatark/world-persistence-contracts"])

test("packages/world-persistence-contracts declares, at most, dependencies on runtime-contracts/living-systems-contracts", () => {
  const deps = packageDependencies(WORLD_PERSISTENCE_CONTRACTS_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !WORLD_PERSISTENCE_CONTRACTS_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `world-persistence-contracts declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/world-persistence-contracts imports, at most, those same two packages in its source", () => {
  const srcDir = join(REPO_ROOT, "packages", WORLD_PERSISTENCE_CONTRACTS_PACKAGE, "src")
  const allowed = new Set(["runtime-contracts", "living-systems-contracts"])
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("packages/world-persistence-runtime declares, at most, dependencies on its four allowed packages", () => {
  const deps = packageDependencies(WORLD_PERSISTENCE_RUNTIME_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !WORLD_PERSISTENCE_RUNTIME_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `world-persistence-runtime declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/world-persistence-runtime imports, at most, those same four packages in its source -- never a renderer, embodiment package, or @avatark/account", () => {
  const srcDir = join(REPO_ROOT, "packages", WORLD_PERSISTENCE_RUNTIME_PACKAGE, "src")
  const allowed = new Set(["runtime-contracts", "living-systems-contracts", "living-systems-runtime", "world-persistence-contracts"])
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("neither world-persistence package's source contains a React/Next.js/Unreal-specific token", () => {
  const forbidden = ["from \"react", "from 'react", "next/server", "next/navigation", "UObject", "AActor", "Blueprint", "UnrealEngine"]
  const violations: string[] = []
  for (const pkg of [WORLD_PERSISTENCE_CONTRACTS_PACKAGE, WORLD_PERSISTENCE_RUNTIME_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", pkg, "src")
    for (const file of listSourceFiles(srcDir)) {
      if (file.endsWith(".test.ts")) continue
      const code = readFileSync(file, "utf-8")
        .split("\n")
        .map((line) => line.replace(/\/\/.*$/, ""))
        .join("\n")
      for (const token of forbidden) {
        if (code.includes(token)) violations.push(`${file} contains "${token}"`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

test("packages/world-persistence-runtime never calls a write method on protected narrative state -- persistence never gets a second mutation path Living Systems itself doesn't have", () => {
  const srcDir = join(REPO_ROOT, "packages", WORLD_PERSISTENCE_RUNTIME_PACKAGE, "src")
  const writeMethodPattern = /protectedNarrative\w*\.(save|put|set|write|mutate|update)\s*\(/i
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    if (file.endsWith(".test.ts")) continue
    const content = readFileSync(file, "utf-8")
    if (writeMethodPattern.test(content)) violations.push(file)
  }
  assert.deepEqual(violations, [])
})

// Sprint 10, Phase 0/20: the same enforcement one layer up again, for the
// living-population boundary -- invariants #4/#5 ("no Unreal/React
// dependency exists in core contracts/runtime"). @avatark/living-
// population-contracts may depend on runtime-contracts and living-
// systems-contracts only (reusing LivingEntityState/EntityArchetype/
// EnvironmentalState/EncounterRule shapes, never redefining them);
// @avatark/living-population-runtime may additionally depend on living-
// systems-runtime (to call resolveAvailableEncounters unmodified) and
// living-population-contracts. Neither may ever depend on renderer-
// contracts, any world-embodiment-*/world-persistence-* package, or
// @avatark/account -- population is a peer of Living Systems, never a
// competing world-state authority, and stays entirely renderer/Unreal-
// neutral; the Host layer (lib/livingPopulation/) is the only place
// population and embodiment/persistence types ever meet.

const LIVING_POPULATION_CONTRACTS_PACKAGE = "living-population-contracts"
const LIVING_POPULATION_RUNTIME_PACKAGE = "living-population-runtime"
const LIVING_POPULATION_CONTRACTS_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/living-systems-contracts"])
const LIVING_POPULATION_RUNTIME_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/living-systems-contracts", "@avatark/living-systems-runtime", "@avatark/living-population-contracts"])

test("packages/living-population-contracts declares, at most, dependencies on runtime-contracts/living-systems-contracts", () => {
  const deps = packageDependencies(LIVING_POPULATION_CONTRACTS_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !LIVING_POPULATION_CONTRACTS_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `living-population-contracts declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/living-population-contracts imports, at most, those same two packages in its source", () => {
  const srcDir = join(REPO_ROOT, "packages", LIVING_POPULATION_CONTRACTS_PACKAGE, "src")
  const allowed = new Set(["runtime-contracts", "living-systems-contracts"])
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("packages/living-population-runtime declares, at most, dependencies on its four allowed packages", () => {
  const deps = packageDependencies(LIVING_POPULATION_RUNTIME_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !LIVING_POPULATION_RUNTIME_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `living-population-runtime declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/living-population-runtime imports, at most, those same four packages in its source -- never a renderer, embodiment/persistence package, or @avatark/account", () => {
  const srcDir = join(REPO_ROOT, "packages", LIVING_POPULATION_RUNTIME_PACKAGE, "src")
  const allowed = new Set(["runtime-contracts", "living-systems-contracts", "living-systems-runtime", "living-population-contracts"])
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("neither living-population package's source contains a React/Next.js/Unreal-specific token", () => {
  const forbidden = ["from \"react", "from 'react", "next/server", "next/navigation", "UObject", "AActor", "Blueprint", "UnrealEngine"]
  const violations: string[] = []
  for (const pkg of [LIVING_POPULATION_CONTRACTS_PACKAGE, LIVING_POPULATION_RUNTIME_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", pkg, "src")
    for (const file of listSourceFiles(srcDir)) {
      if (file.endsWith(".test.ts")) continue
      const code = readFileSync(file, "utf-8")
        .split("\n")
        .map((line) => line.replace(/\/\/.*$/, ""))
        .join("\n")
      for (const token of forbidden) {
        if (code.includes(token)) violations.push(`${file} contains "${token}"`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

test("packages/living-population-runtime never calls a write method on protected narrative state -- population never gets a second mutation path Living Systems itself doesn't have", () => {
  const srcDir = join(REPO_ROOT, "packages", LIVING_POPULATION_RUNTIME_PACKAGE, "src")
  const writeMethodPattern = /protectedNarrative\w*\.(save|put|set|write|mutate|update)\s*\(/i
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    if (file.endsWith(".test.ts")) continue
    const content = readFileSync(file, "utf-8")
    if (writeMethodPattern.test(content)) violations.push(file)
  }
  assert.deepEqual(violations, [])
})

// Sprint 11, Phase 22/24: the same enforcement one layer up again, for
// the World Memory boundary -- invariant #17 ("core is Unreal-free")
// and #18 ("core is Web/React-free"). @avatark/world-memory-contracts
// may depend on runtime-contracts and living-systems-contracts only
// (reusing EntityId/EncounterCategory/etc, never redefining them);
// @avatark/world-memory-runtime may additionally depend on
// living-population-contracts (for the PopulationEvent/EncounterOpportunity
// input shapes World Memory reacts to -- see
// docs/SPRINT11_GROUND_TRUTH.md's dependency-direction decision) and
// world-memory-contracts. Neither may ever depend on renderer-contracts,
// any world-embodiment-*/world-persistence-*/living-population-RUNTIME
// package, or @avatark/account -- World Memory observes structured
// deltas the Host layer builds; it never queries simulation/persistence/
// population internals itself.

const WORLD_MEMORY_CONTRACTS_PACKAGE = "world-memory-contracts"
const WORLD_MEMORY_RUNTIME_PACKAGE = "world-memory-runtime"
const WORLD_MEMORY_CONTRACTS_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/living-systems-contracts"])
const WORLD_MEMORY_RUNTIME_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/living-systems-contracts", "@avatark/living-population-contracts", "@avatark/world-memory-contracts"])

test("packages/world-memory-contracts declares, at most, dependencies on runtime-contracts/living-systems-contracts", () => {
  const deps = packageDependencies(WORLD_MEMORY_CONTRACTS_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !WORLD_MEMORY_CONTRACTS_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `world-memory-contracts declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/world-memory-contracts imports, at most, those same two packages in its source", () => {
  const srcDir = join(REPO_ROOT, "packages", WORLD_MEMORY_CONTRACTS_PACKAGE, "src")
  const allowed = new Set(["runtime-contracts", "living-systems-contracts"])
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("packages/world-memory-runtime declares, at most, dependencies on its four allowed packages", () => {
  const deps = packageDependencies(WORLD_MEMORY_RUNTIME_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !WORLD_MEMORY_RUNTIME_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `world-memory-runtime declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/world-memory-runtime imports, at most, those same four packages in its source -- never a renderer, embodiment/persistence/population-runtime package, or @avatark/account", () => {
  const srcDir = join(REPO_ROOT, "packages", WORLD_MEMORY_RUNTIME_PACKAGE, "src")
  const allowed = new Set(["runtime-contracts", "living-systems-contracts", "living-population-contracts", "world-memory-contracts"])
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("neither world-memory package's source contains a React/Next.js/Unreal-specific token", () => {
  const forbidden = ["from \"react", "from 'react", "next/server", "next/navigation", "UObject", "AActor", "Blueprint", "UnrealEngine"]
  const violations: string[] = []
  for (const pkg of [WORLD_MEMORY_CONTRACTS_PACKAGE, WORLD_MEMORY_RUNTIME_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", pkg, "src")
    for (const file of listSourceFiles(srcDir)) {
      if (file.endsWith(".test.ts")) continue
      const code = readFileSync(file, "utf-8")
        .split("\n")
        .map((line) => line.replace(/\/\/.*$/, ""))
        .join("\n")
      for (const token of forbidden) {
        if (code.includes(token)) violations.push(`${file} contains "${token}"`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

// Sprint 11, Phase 14: the critical protected-narrative-immutability
// invariant, restated for World Memory -- it must never gain a write
// path to protected narrative state, mirroring Sprint 7/9/10's own
// defense in depth for the same interface.
test("packages/world-memory-runtime never calls a write method on protected narrative state", () => {
  const srcDir = join(REPO_ROOT, "packages", WORLD_MEMORY_RUNTIME_PACKAGE, "src")
  const writeMethodPattern = /protectedNarrative\w*\.(save|put|set|write|mutate|update)\s*\(/i
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    if (file.endsWith(".test.ts")) continue
    const content = readFileSync(file, "utf-8")
    if (writeMethodPattern.test(content)) violations.push(file)
  }
  assert.deepEqual(violations, [])
})

// Sprint 12, Phase 22/24: the same enforcement one layer up again, for
// the Social Ecology boundary -- invariant restated once more ("core
// is Unreal-free," "core is Web/React-free"). @avatark/social-ecology-
// contracts may depend on runtime-contracts and living-systems-contracts
// (shared id types) and living-population-contracts (EntityId/GroupId
// reuse -- relationships and group memberships are about population
// entities); @avatark/social-ecology-runtime may additionally depend on
// social-ecology-contracts. Neither may ever depend on renderer-contracts,
// any world-embodiment-*/world-persistence-*/world-memory-*/living-
// population-RUNTIME package, or @avatark/account -- social ecology
// observes population/group facts the Host layer already resolved; it
// never queries simulation/persistence/memory internals itself, and it
// is never queried BY living-population-runtime either (the dependency
// runs one way only, enforced by living-population-runtime's own
// "at most four allowed packages" test above, since social-ecology-*
// is not in that allowed set).

const SOCIAL_ECOLOGY_CONTRACTS_PACKAGE = "social-ecology-contracts"
const SOCIAL_ECOLOGY_RUNTIME_PACKAGE = "social-ecology-runtime"
const SOCIAL_ECOLOGY_CONTRACTS_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/living-systems-contracts", "@avatark/living-population-contracts"])
const SOCIAL_ECOLOGY_RUNTIME_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/living-systems-contracts", "@avatark/living-population-contracts", "@avatark/social-ecology-contracts"])

test("packages/social-ecology-contracts declares, at most, dependencies on runtime-contracts/living-systems-contracts/living-population-contracts", () => {
  const deps = packageDependencies(SOCIAL_ECOLOGY_CONTRACTS_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !SOCIAL_ECOLOGY_CONTRACTS_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `social-ecology-contracts declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/social-ecology-contracts imports, at most, those same three packages in its source", () => {
  const srcDir = join(REPO_ROOT, "packages", SOCIAL_ECOLOGY_CONTRACTS_PACKAGE, "src")
  const allowed = new Set(["runtime-contracts", "living-systems-contracts", "living-population-contracts"])
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("packages/social-ecology-runtime declares, at most, dependencies on its four allowed packages", () => {
  const deps = packageDependencies(SOCIAL_ECOLOGY_RUNTIME_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !SOCIAL_ECOLOGY_RUNTIME_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `social-ecology-runtime declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/social-ecology-runtime imports, at most, those same four packages in its source -- never a renderer, embodiment/persistence/memory/population-runtime package, or @avatark/account", () => {
  const srcDir = join(REPO_ROOT, "packages", SOCIAL_ECOLOGY_RUNTIME_PACKAGE, "src")
  const allowed = new Set(["runtime-contracts", "living-systems-contracts", "living-population-contracts", "social-ecology-contracts"])
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("neither social-ecology package's source contains a React/Next.js/Unreal-specific token", () => {
  const forbidden = ["from \"react", "from 'react", "next/server", "next/navigation", "UObject", "AActor", "Blueprint", "UnrealEngine"]
  const violations: string[] = []
  for (const pkg of [SOCIAL_ECOLOGY_CONTRACTS_PACKAGE, SOCIAL_ECOLOGY_RUNTIME_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", pkg, "src")
    for (const file of listSourceFiles(srcDir)) {
      if (file.endsWith(".test.ts")) continue
      const code = readFileSync(file, "utf-8")
        .split("\n")
        .map((line) => line.replace(/\/\/.*$/, ""))
        .join("\n")
      for (const token of forbidden) {
        if (code.includes(token)) violations.push(`${file} contains "${token}"`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

// Sprint 12: social ecology never reads protected narrative at all
// (see docs/SPRINT12_GROUND_TRUTH.md's ownership map), so this test
// asserts the strongest possible form of the invariant every prior
// sprint's runtime carries -- zero occurrence of the identifier at
// all, not merely zero write-method calls.
test("packages/social-ecology-runtime never references protected narrative state at all", () => {
  const srcDir = join(REPO_ROOT, "packages", SOCIAL_ECOLOGY_RUNTIME_PACKAGE, "src")
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    if (file.endsWith(".test.ts")) continue
    const content = readFileSync(file, "utf-8")
    if (/protectedNarrative/i.test(content)) violations.push(file)
  }
  assert.deepEqual(violations, [])
})

// Sprint 13, Phase 20/23: the same enforcement one layer up again, for
// the Living Rhythms boundary. @avatark/living-rhythms-contracts may
// depend on runtime-contracts and living-systems-contracts (shared id
// types), living-population-contracts (BehaviorType/ResourceTag/GroupId
// reuse -- routines and place occupancy are about population entities),
// and social-ecology-contracts (RelationshipType reuse for
// SocialInteractionOpportunity, see docs/SPRINT13_GROUND_TRUTH.md's
// decision 5); @avatark/living-rhythms-runtime may additionally depend
// on living-rhythms-contracts itself. Neither may ever depend on
// renderer-contracts, any world-embodiment-*/world-persistence-*/world-
// memory-*/living-population-RUNTIME package, or @avatark/account --
// living rhythms observes population/group/environment/relationship
// facts the Host layer already resolved; it never queries simulation/
// persistence/memory internals itself, and living-population-runtime
// never depends on it either (see behaviorSelection.ts's own decoupled
// DayPhaseInput/RoutineWindowInput local types, deliberately structurally
// compatible rather than imported).

const LIVING_RHYTHMS_CONTRACTS_PACKAGE = "living-rhythms-contracts"
const LIVING_RHYTHMS_RUNTIME_PACKAGE = "living-rhythms-runtime"
const LIVING_RHYTHMS_CONTRACTS_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/living-systems-contracts", "@avatark/living-population-contracts", "@avatark/social-ecology-contracts"])
const LIVING_RHYTHMS_RUNTIME_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/living-systems-contracts", "@avatark/living-population-contracts", "@avatark/social-ecology-contracts", "@avatark/living-rhythms-contracts"])

const ENCOUNTER_REALIZATION_CONTRACTS_PACKAGE = "encounter-realization-contracts"
const ENCOUNTER_REALIZATION_RUNTIME_PACKAGE = "encounter-realization-runtime"
const ENCOUNTER_REALIZATION_CONTRACTS_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/living-systems-contracts", "@avatark/living-population-contracts", "@avatark/social-ecology-contracts", "@avatark/world-memory-contracts"])
const ENCOUNTER_REALIZATION_RUNTIME_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/living-systems-contracts", "@avatark/living-population-contracts", "@avatark/social-ecology-contracts", "@avatark/world-memory-contracts", "@avatark/encounter-realization-contracts"])

test("packages/living-rhythms-contracts declares, at most, dependencies on runtime-contracts/living-systems-contracts/living-population-contracts/social-ecology-contracts", () => {
  const deps = packageDependencies(LIVING_RHYTHMS_CONTRACTS_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !LIVING_RHYTHMS_CONTRACTS_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `living-rhythms-contracts declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/living-rhythms-contracts imports, at most, those same four packages in its source", () => {
  const srcDir = join(REPO_ROOT, "packages", LIVING_RHYTHMS_CONTRACTS_PACKAGE, "src")
  const allowed = new Set(["runtime-contracts", "living-systems-contracts", "living-population-contracts", "social-ecology-contracts"])
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("packages/living-rhythms-runtime declares, at most, dependencies on its five allowed packages", () => {
  const deps = packageDependencies(LIVING_RHYTHMS_RUNTIME_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !LIVING_RHYTHMS_RUNTIME_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `living-rhythms-runtime declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/living-rhythms-runtime imports, at most, those same five packages in its source -- never a renderer, embodiment/persistence/memory/population-runtime package, or @avatark/account", () => {
  const srcDir = join(REPO_ROOT, "packages", LIVING_RHYTHMS_RUNTIME_PACKAGE, "src")
  const allowed = new Set(["runtime-contracts", "living-systems-contracts", "living-population-contracts", "social-ecology-contracts", "living-rhythms-contracts"])
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("neither living-rhythms package's source contains a React/Next.js/Unreal-specific token", () => {
  const forbidden = ["from \"react", "from 'react", "next/server", "next/navigation", "UObject", "AActor", "Blueprint", "UnrealEngine"]
  const violations: string[] = []
  for (const pkg of [LIVING_RHYTHMS_CONTRACTS_PACKAGE, LIVING_RHYTHMS_RUNTIME_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", pkg, "src")
    for (const file of listSourceFiles(srcDir)) {
      if (file.endsWith(".test.ts")) continue
      const code = readFileSync(file, "utf-8")
        .split("\n")
        .map((line) => line.replace(/\/\/.*$/, ""))
        .join("\n")
      for (const token of forbidden) {
        if (code.includes(token)) violations.push(`${file} contains "${token}"`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

// Sprint 13: living rhythms never reads protected narrative at all (see
// docs/SPRINT13_GROUND_TRUTH.md's ownership map), so this test asserts
// the strongest possible form of the invariant every prior sprint's
// runtime carries -- zero occurrence of the identifier at all, not
// merely zero write-method calls.
test("packages/living-rhythms-runtime never references protected narrative state at all", () => {
  const srcDir = join(REPO_ROOT, "packages", LIVING_RHYTHMS_RUNTIME_PACKAGE, "src")
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    if (file.endsWith(".test.ts")) continue
    const content = readFileSync(file, "utf-8")
    if (/protectedNarrative/i.test(content)) violations.push(file)
  }
  assert.deepEqual(violations, [])
})

// Sprint 14: encounter-realization-contracts declares/imports at most
// its five allowed contracts packages; encounter-realization-runtime
// adds only its own contracts package on top -- ZERO sibling runtime
// package (living-rhythms-runtime/social-ecology-runtime/
// world-memory-runtime/living-population-runtime), matching the exact
// discipline that forced this sprint's own deriveEncounterRecordId to
// be a documented restatement rather than an import (see
// docs/SPRINT14_GROUND_TRUTH.md).
test("packages/encounter-realization-contracts declares, at most, dependencies on its five allowed contracts packages", () => {
  const deps = packageDependencies(ENCOUNTER_REALIZATION_CONTRACTS_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !ENCOUNTER_REALIZATION_CONTRACTS_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `encounter-realization-contracts declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/encounter-realization-contracts imports, at most, those same five packages in its source", () => {
  const srcDir = join(REPO_ROOT, "packages", ENCOUNTER_REALIZATION_CONTRACTS_PACKAGE, "src")
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!ENCOUNTER_REALIZATION_CONTRACTS_ALLOWED_DEPS.has(`@avatark/${importedPackage}`)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("packages/encounter-realization-runtime declares, at most, dependencies on its six allowed packages", () => {
  const deps = packageDependencies(ENCOUNTER_REALIZATION_RUNTIME_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !ENCOUNTER_REALIZATION_RUNTIME_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `encounter-realization-runtime declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/encounter-realization-runtime imports, at most, those same six packages in its source -- never a sibling runtime, renderer, embodiment/persistence package, or @avatark/account", () => {
  const srcDir = join(REPO_ROOT, "packages", ENCOUNTER_REALIZATION_RUNTIME_PACKAGE, "src")
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!ENCOUNTER_REALIZATION_RUNTIME_ALLOWED_DEPS.has(`@avatark/${importedPackage}`)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("neither encounter-realization package's source contains a React/Next.js/Unreal-specific token", () => {
  const forbidden = ["from \"react", "from 'react", "next/server", "next/navigation", "UObject", "AActor", "Blueprint", "UnrealEngine"]
  const violations: string[] = []
  for (const pkg of [ENCOUNTER_REALIZATION_CONTRACTS_PACKAGE, ENCOUNTER_REALIZATION_RUNTIME_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", pkg, "src")
    for (const file of listSourceFiles(srcDir)) {
      if (file.endsWith(".test.ts")) continue
      const code = readFileSync(file, "utf-8")
        .split("\n")
        .map((line) => line.replace(/\/\/.*$/, ""))
        .join("\n")
      for (const token of forbidden) {
        if (code.includes(token)) violations.push(`${file} contains "${token}"`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

// Sprint 14: this domain only ever READS protectedNarrative (the
// resolver's own hard BLOCKED gate, re-checking Sprint 7's own rule --
// see docs/SPRINT14_GROUND_TRUTH.md) -- it must never call `.save`/
// `.put`/`.mutate` on it, the same write-method check every prior
// sprint's own runtime carries.
test("packages/encounter-realization-runtime never calls a write method on protected narrative state", () => {
  const srcDir = join(REPO_ROOT, "packages", ENCOUNTER_REALIZATION_RUNTIME_PACKAGE, "src")
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    if (file.endsWith(".test.ts")) continue
    const content = readFileSync(file, "utf-8")
    if (/protectedNarrative\w*\.(save|put|mutate|write)\s*\(/.test(content)) violations.push(file)
  }
  assert.deepEqual(violations, [])
})

// Sprint 15, mission's own "ARCHITECTURAL LAW"/"RENDERER NEUTRALITY"
// sections: @avatark/world-adaptation-contracts may depend on
// runtime-contracts (shared id types) and world-memory-contracts
// (CausalReference reuse for provenance -- adaptation never invents its
// own causal-reference shape); @avatark/world-adaptation-runtime may
// additionally depend on world-adaptation-contracts itself. Neither may
// ever depend on a sibling runtime package (living-systems-runtime/
// living-population-runtime/social-ecology-runtime/living-rhythms-runtime/
// world-memory-runtime/encounter-realization-runtime), renderer-contracts,
// any world-embodiment-*/world-persistence-* package, or @avatark/account --
// this domain observes plain, structured facts (realized-encounter
// participants/location/relationships, resource-opportunity readings)
// the Host layer already resolved; it never queries simulation/
// persistence/memory/social/rhythms/encounter-realization internals
// itself, matching the exact same-generation discipline
// encounter-realization-contracts/-runtime already established one
// sprint earlier.
const WORLD_ADAPTATION_CONTRACTS_PACKAGE = "world-adaptation-contracts"
const WORLD_ADAPTATION_RUNTIME_PACKAGE = "world-adaptation-runtime"
const WORLD_ADAPTATION_CONTRACTS_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/world-memory-contracts"])
const WORLD_ADAPTATION_RUNTIME_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/world-memory-contracts", "@avatark/world-adaptation-contracts"])

test("packages/world-adaptation-contracts declares, at most, dependencies on its two allowed contracts packages", () => {
  const deps = packageDependencies(WORLD_ADAPTATION_CONTRACTS_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !WORLD_ADAPTATION_CONTRACTS_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `world-adaptation-contracts declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/world-adaptation-contracts imports, at most, those same two packages in its source", () => {
  const srcDir = join(REPO_ROOT, "packages", WORLD_ADAPTATION_CONTRACTS_PACKAGE, "src")
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!WORLD_ADAPTATION_CONTRACTS_ALLOWED_DEPS.has(`@avatark/${importedPackage}`)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("packages/world-adaptation-runtime declares, at most, dependencies on its three allowed packages", () => {
  const deps = packageDependencies(WORLD_ADAPTATION_RUNTIME_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !WORLD_ADAPTATION_RUNTIME_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `world-adaptation-runtime declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/world-adaptation-runtime imports, at most, those same three packages in its source -- never a sibling runtime, renderer, embodiment/persistence package, or @avatark/account", () => {
  const srcDir = join(REPO_ROOT, "packages", WORLD_ADAPTATION_RUNTIME_PACKAGE, "src")
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!WORLD_ADAPTATION_RUNTIME_ALLOWED_DEPS.has(`@avatark/${importedPackage}`)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("neither world-adaptation package's source contains a React/Next.js/Unreal-specific token", () => {
  const forbidden = ["from \"react", "from 'react", "next/server", "next/navigation", "UObject", "AActor", "Blueprint", "UnrealEngine"]
  const violations: string[] = []
  for (const pkg of [WORLD_ADAPTATION_CONTRACTS_PACKAGE, WORLD_ADAPTATION_RUNTIME_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", pkg, "src")
    for (const file of listSourceFiles(srcDir)) {
      if (file.endsWith(".test.ts")) continue
      const code = readFileSync(file, "utf-8")
        .split("\n")
        .map((line) => line.replace(/\/\/.*$/, ""))
        .join("\n")
      for (const token of forbidden) {
        if (code.includes(token)) violations.push(`${file} contains "${token}"`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

// Sprint 15: this domain never touches protected canonical narrative
// state at all -- the strongest form of the invariant (zero occurrence
// of the identifier, not merely zero write-method calls), the same
// posture living-rhythms-runtime's own equivalent test already holds.
// Adaptation composes ENTITY/RELATIONSHIP/PLACE/WORLD_POSSIBILITY state
// only; it has no legitimate reason to ever reference Canon.
test("packages/world-adaptation-runtime never references protected narrative state at all", () => {
  const srcDir = join(REPO_ROOT, "packages", WORLD_ADAPTATION_RUNTIME_PACKAGE, "src")
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    if (file.endsWith(".test.ts")) continue
    const content = readFileSync(file, "utf-8")
    if (/protectedNarrative/i.test(content)) violations.push(file)
  }
  assert.deepEqual(violations, [])
})

// Sprint 15, mission's own "MULTI-VISITOR LAW": one visitor's private
// meaningful memory must never silently mutate shared-world adaptation.
// Neither the pure runtime nor the Host layer's own hostService.ts may
// reference VisitorWorldMemory/VisitorWorldMemoryRepository at all --
// adaptation signals derive exclusively from shared, authoritative
// world/entity/relationship state, never from a visitor-scoped record.
test("world-adaptation package sources and lib/worldAdaptation/hostService.ts never reference VisitorWorldMemory at all", () => {
  const violations: string[] = []
  for (const pkg of [WORLD_ADAPTATION_CONTRACTS_PACKAGE, WORLD_ADAPTATION_RUNTIME_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", pkg, "src")
    for (const file of listSourceFiles(srcDir)) {
      if (/VisitorWorldMemory/.test(readFileSync(file, "utf-8"))) violations.push(file)
    }
  }
  const hostServicePath = join(REPO_ROOT, "lib", "worldAdaptation", "hostService.ts")
  if (/VisitorWorldMemory/.test(readFileSync(hostServicePath, "utf-8"))) violations.push(hostServicePath)
  assert.deepEqual(violations, [])
})

// Sprint 18, mission's own "ARCHITECTURAL LAW"/"security/authority
// invariants" sections: @avatark/canonical-event-contracts may depend
// on runtime-contracts (shared id types), living-systems-contracts
// (EntityId reuse for the ENTITY_SET projection-scope variant),
// spatial-ecology-contracts (the REAL Sprint 16 hierarchy ids --
// DomainId/SectorId/QuadrantId/PatchId/LocalPlaceId -- for
// CanonicalEventProjectionScope, reconciled against Sprint 16's actual
// closed landing rather than Phase 0's own placeholder strings), and
// world-memory-contracts (CausalReference reuse for eligibility
// reasons, WorldEventId reuse for the projection's own worldEventId
// link) -- canonical-event-contracts never invents its own causal-
// reference or event-id shape. @avatark/canonical-event-runtime may
// additionally depend on canonical-event-contracts itself. Neither may
// ever depend on a sibling runtime package (living-systems-runtime/
// living-population-runtime/social-ecology-runtime/living-rhythms-runtime/
// world-memory-runtime/encounter-realization-runtime/world-adaptation-runtime/
// spatial-ecology-runtime), renderer-contracts, any world-embodiment-*/
// world-persistence-* package, or @avatark/account -- this domain
// observes plain, structured facts (tick/season/reached-location/
// narrative-gate state) the Host layer already resolved; it never
// queries simulation/persistence/memory/social/rhythms/encounter-
// realization/adaptation/spatial internals itself.
const CANONICAL_EVENT_CONTRACTS_PACKAGE = "canonical-event-contracts"
const CANONICAL_EVENT_RUNTIME_PACKAGE = "canonical-event-runtime"
const CANONICAL_EVENT_CONTRACTS_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/living-systems-contracts", "@avatark/spatial-ecology-contracts", "@avatark/world-memory-contracts"])
const CANONICAL_EVENT_RUNTIME_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/canonical-event-contracts"])

test("packages/canonical-event-contracts declares, at most, dependencies on its four allowed contracts packages", () => {
  const deps = packageDependencies(CANONICAL_EVENT_CONTRACTS_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !CANONICAL_EVENT_CONTRACTS_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `canonical-event-contracts declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/canonical-event-contracts imports, at most, those same four packages in its source", () => {
  const srcDir = join(REPO_ROOT, "packages", CANONICAL_EVENT_CONTRACTS_PACKAGE, "src")
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!CANONICAL_EVENT_CONTRACTS_ALLOWED_DEPS.has(`@avatark/${importedPackage}`)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("packages/canonical-event-runtime declares, at most, dependencies on its two allowed packages", () => {
  const deps = packageDependencies(CANONICAL_EVENT_RUNTIME_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !CANONICAL_EVENT_RUNTIME_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `canonical-event-runtime declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/canonical-event-runtime imports, at most, those same two packages in its source -- never a sibling runtime, renderer, embodiment/persistence package, or @avatark/account", () => {
  const srcDir = join(REPO_ROOT, "packages", CANONICAL_EVENT_RUNTIME_PACKAGE, "src")
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!CANONICAL_EVENT_RUNTIME_ALLOWED_DEPS.has(`@avatark/${importedPackage}`)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("neither canonical-event package's source contains a React/Next.js/Unreal-specific token", () => {
  const forbidden = ["from \"react", "from 'react", "next/server", "next/navigation", "UObject", "AActor", "Blueprint", "UnrealEngine"]
  const violations: string[] = []
  for (const pkg of [CANONICAL_EVENT_CONTRACTS_PACKAGE, CANONICAL_EVENT_RUNTIME_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", pkg, "src")
    for (const file of listSourceFiles(srcDir)) {
      if (file.endsWith(".test.ts")) continue
      const code = readFileSync(file, "utf-8")
        .split("\n")
        .map((line) => line.replace(/\/\/.*$/, ""))
        .join("\n")
      for (const token of forbidden) {
        if (code.includes(token)) violations.push(`${file} contains "${token}"`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

// Sprint 18: this domain never touches protected canonical narrative
// state at all -- the strongest form of the invariant. NARRATIVE_GATE_OPEN
// eligibility is judged against a plain `Record<string, boolean>` the
// Host layer translates real gate state into (see
// @avatark/canonical-event-runtime's own `eligibility.ts` doc comment);
// canonical-event-runtime has no legitimate reason to ever import
// `ProtectedNarrativeProjection`/`ProtectedNarrativeStateRepository`.
test("packages/canonical-event-runtime never references protected narrative state at all", () => {
  const srcDir = join(REPO_ROOT, "packages", CANONICAL_EVENT_RUNTIME_PACKAGE, "src")
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    if (file.endsWith(".test.ts")) continue
    const content = readFileSync(file, "utf-8")
    if (/protectedNarrative/i.test(content)) violations.push(file)
  }
  assert.deepEqual(violations, [])
})

// Sprint 18, Phase 0 §4/§24: Canon immutability is structural, not
// conventional -- `CanonicalEventDefinition` has no repository at all
// (not even a get-only one), so there is no write-shaped call to scan
// for on that type specifically. This test instead proves the STRONGER
// claim Phase 0 §24 actually asks for: no file in either canonical-event
// package, or in this file's own Host integration
// (lib/canonicalEvents/hostService.ts), ever calls a save/put/set/
// write/mutate/update-shaped method on anything spelled
// `canonicalEventDefinition*` -- the same regex-scan mechanism already
// applied to protected narrative state, extended to this new subject.
test("no file in canonical-event packages or lib/canonicalEvents calls a write-shaped method on canonicalEventDefinition -- Canon immutability holds because no such write path exists at all", () => {
  const violations: string[] = []
  const dirsToScan = [join(REPO_ROOT, "packages", CANONICAL_EVENT_CONTRACTS_PACKAGE, "src"), join(REPO_ROOT, "packages", CANONICAL_EVENT_RUNTIME_PACKAGE, "src"), join(REPO_ROOT, "lib", "canonicalEvents")]
  for (const dir of dirsToScan) {
    for (const file of listSourceFiles(dir)) {
      const content = readFileSync(file, "utf-8")
      if (/canonicalEventDefinition\w*\.(save|put|set|write|mutate|update)\(/.test(content)) violations.push(file)
    }
  }
  assert.deepEqual(violations, [])
})

// Sprint 18, mission's own "MULTI-VISITOR LAW" precedent (Sprint 15's
// own equivalent check): shared canonical-event projection state
// (Fact A, WorldInstanceCanonicalProjectionState) must never be
// mutated by a visitor's own private state. Neither canonical-event
// package's source may reference VisitorWorldMemory at all --
// witnessing (Fact B, VisitorCanonicalEventWitness) is its own,
// separate, additive-only shape, never a reuse of that repository.
test("canonical-event package sources never reference VisitorWorldMemory at all", () => {
  const violations: string[] = []
  for (const pkg of [CANONICAL_EVENT_CONTRACTS_PACKAGE, CANONICAL_EVENT_RUNTIME_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", pkg, "src")
    for (const file of listSourceFiles(srcDir)) {
      if (/VisitorWorldMemory/.test(readFileSync(file, "utf-8"))) violations.push(file)
    }
  }
  assert.deepEqual(violations, [])
})

// Sprint 19: the visitor-participation domain (ParticipationRecord/
// ParticipationAuthorization/deriveParticipationRecordId). Its contracts
// package depends on the same real Sprint 14 EncounterRecordId type
// its Host layer (lib/participation/hostService.ts) links a
// ParticipationRecord to -- never a sibling runtime, never
// @avatark/account. Its runtime package derives no consequence itself
// (see @avatark/participation-runtime's own package.json description).
const PARTICIPATION_CONTRACTS_PACKAGE = "participation-contracts"
const PARTICIPATION_RUNTIME_PACKAGE = "participation-runtime"
const PARTICIPATION_CONTRACTS_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/living-systems-contracts", "@avatark/encounter-realization-contracts"])
const PARTICIPATION_RUNTIME_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts", "@avatark/participation-contracts"])

test("packages/participation-contracts declares, at most, dependencies on its three allowed contracts packages", () => {
  const deps = packageDependencies(PARTICIPATION_CONTRACTS_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !PARTICIPATION_CONTRACTS_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `participation-contracts declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/participation-contracts imports, at most, those same three packages in its source", () => {
  const srcDir = join(REPO_ROOT, "packages", PARTICIPATION_CONTRACTS_PACKAGE, "src")
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!PARTICIPATION_CONTRACTS_ALLOWED_DEPS.has(`@avatark/${importedPackage}`)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("packages/participation-runtime declares, at most, dependencies on its two allowed packages", () => {
  const deps = packageDependencies(PARTICIPATION_RUNTIME_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !PARTICIPATION_RUNTIME_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `participation-runtime declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/participation-runtime imports, at most, those same two packages in its source -- never a sibling runtime, renderer, embodiment/persistence package, or @avatark/account", () => {
  const srcDir = join(REPO_ROOT, "packages", PARTICIPATION_RUNTIME_PACKAGE, "src")
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!PARTICIPATION_RUNTIME_ALLOWED_DEPS.has(`@avatark/${importedPackage}`)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("neither participation package's source contains a React/Next.js/Unreal-specific token", () => {
  const forbidden = ["from \"react", "from 'react", "next/server", "next/navigation", "UObject", "AActor", "Blueprint", "UnrealEngine"]
  const violations: string[] = []
  for (const pkg of [PARTICIPATION_CONTRACTS_PACKAGE, PARTICIPATION_RUNTIME_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", pkg, "src")
    for (const file of listSourceFiles(srcDir)) {
      if (file.endsWith(".test.ts")) continue
      const code = readFileSync(file, "utf-8")
        .split("\n")
        .map((line) => line.replace(/\/\/.*$/, ""))
        .join("\n")
      for (const token of forbidden) {
        if (code.includes(token)) violations.push(`${file} contains "${token}"`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

// Sprint 19, invariant #4 (bounded consequences): ParticipationRecord is
// additive-only. No file in either participation package, or in
// lib/participation, ever calls a save/put/set/write/mutate/update-shaped
// method on anything spelled `encounterRecordRepository`/
// `worldEventRepository`/`adaptationEffectRepository`/
// `canonicalProjectionStateRepository` -- the same regex-scan mechanism
// already applied to canonicalEventDefinition, extended to prove
// participation never becomes a SECOND consequence-derivation authority
// alongside Sprint 14/15/18's own sole write boundaries.
test("no file in participation packages or lib/participation writes to any Sprint 14/15/18 consequence repository -- ParticipationRecord is the only write this domain performs", () => {
  const violations: string[] = []
  const dirsToScan = [join(REPO_ROOT, "packages", PARTICIPATION_CONTRACTS_PACKAGE, "src"), join(REPO_ROOT, "packages", PARTICIPATION_RUNTIME_PACKAGE, "src"), join(REPO_ROOT, "lib", "participation")]
  const forbiddenWriteTargets = ["encounterRecordRepository", "worldEventRepository", "adaptationEffectRepository", "canonicalProjectionStateRepository", "entityMemoryRepository", "relationshipRepository"]
  for (const dir of dirsToScan) {
    for (const file of listSourceFiles(dir)) {
      const content = readFileSync(file, "utf-8")
      for (const target of forbiddenWriteTargets) {
        if (new RegExp(`${target}\\.(save|put|set|write|mutate|update|append)\\(`).test(content)) violations.push(`${file} writes to ${target}`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

// Sprint 19: the private-reflection firewall (invariant #2). The
// STRUCTURAL half (no world-wide read method exists at all) is proven in
// @avatark/private-reflection-contracts' own privateReflection.test.ts.
// This is the OTHER half: no simulation-resolver runtime package, in
// either direction, ever imports @avatark/private-reflection-contracts
// or @avatark/private-reflection-runtime -- a visitor's private content
// is structurally unreachable from every resolver that could turn it
// into shared world truth, not merely unreachable by convention.
const PRIVATE_REFLECTION_CONTRACTS_PACKAGE = "private-reflection-contracts"
const PRIVATE_REFLECTION_RUNTIME_PACKAGE = "private-reflection-runtime"
const PRIVATE_REFLECTION_CONTRACTS_ALLOWED_DEPS = new Set(["@avatark/runtime-contracts"])
const PRIVATE_REFLECTION_RUNTIME_ALLOWED_DEPS = new Set(["@avatark/private-reflection-contracts"])
const SIMULATION_RESOLVER_RUNTIME_PACKAGES = [
  "living-systems-runtime",
  "world-memory-runtime",
  "world-adaptation-runtime",
  "encounter-realization-runtime",
  "canonical-event-runtime",
  "spatial-ecology-runtime",
  "social-ecology-runtime",
  "participation-runtime",
  "living-population-runtime",
  "living-rhythms-runtime",
  "world-persistence-runtime",
  "world-embodiment-runtime",
]

test("packages/private-reflection-contracts declares, at most, one allowed dependency", () => {
  const deps = packageDependencies(PRIVATE_REFLECTION_CONTRACTS_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !PRIVATE_REFLECTION_CONTRACTS_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `private-reflection-contracts declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/private-reflection-runtime declares, at most, one allowed dependency", () => {
  const deps = packageDependencies(PRIVATE_REFLECTION_RUNTIME_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !PRIVATE_REFLECTION_RUNTIME_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `private-reflection-runtime declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("neither private-reflection package's source contains a React/Next.js/Unreal-specific token", () => {
  const forbidden = ["from \"react", "from 'react", "next/server", "next/navigation", "UObject", "AActor", "Blueprint", "UnrealEngine"]
  const violations: string[] = []
  for (const pkg of [PRIVATE_REFLECTION_CONTRACTS_PACKAGE, PRIVATE_REFLECTION_RUNTIME_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", pkg, "src")
    for (const file of listSourceFiles(srcDir)) {
      if (file.endsWith(".test.ts")) continue
      const code = readFileSync(file, "utf-8")
      for (const token of forbidden) {
        if (code.includes(token)) violations.push(`${file} contains "${token}"`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

test("no simulation-resolver runtime package ever imports @avatark/private-reflection-contracts or @avatark/private-reflection-runtime -- private content is structurally unreachable, not merely unreachable by convention", () => {
  const violations: string[] = []
  for (const pkg of SIMULATION_RESOLVER_RUNTIME_PACKAGES) {
    const srcDir = join(REPO_ROOT, "packages", pkg, "src")
    for (const file of listSourceFiles(srcDir)) {
      for (const importedPackage of findAvatarkImports(file)) {
        if (importedPackage === PRIVATE_REFLECTION_CONTRACTS_PACKAGE || importedPackage === PRIVATE_REFLECTION_RUNTIME_PACKAGE) violations.push(`${file} imports @avatark/${importedPackage}`)
      }
    }
  }
  assert.deepEqual(violations, [])
})

test("no Host simulation-composition file (lib/*/hostService.ts, excluding lib/privateReflection and lib/worldEmbodiment's own front-door) ever imports lib/privateReflection", () => {
  const libDir = join(REPO_ROOT, "lib")
  const hostServiceFiles = readdirSync(libDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "privateReflection" && entry.name !== "worldEmbodiment" && entry.name !== "participation")
    .map((entry) => join(libDir, entry.name, "hostService.ts"))
    .filter((path) => {
      try {
        statSync(path)
        return true
      } catch {
        return false
      }
    })
  const violations: string[] = []
  for (const file of hostServiceFiles) {
    if (/privateReflection/.test(readFileSync(file, "utf-8"))) violations.push(file)
  }
  assert.deepEqual(violations, [])
})

test("sanity: this check actually inspects real directories, not an accidental no-op", () => {
  for (const runtimePackage of [...RUNTIME_PACKAGES, CONTRACTS_PACKAGE, RENDERER_CONTRACTS_PACKAGE, LIVING_SYSTEMS_CONTRACTS_PACKAGE, LIVING_SYSTEMS_RUNTIME_PACKAGE, WORLD_EMBODIMENT_CONTRACTS_PACKAGE, WORLD_EMBODIMENT_RUNTIME_PACKAGE, WORLD_PERSISTENCE_CONTRACTS_PACKAGE, WORLD_PERSISTENCE_RUNTIME_PACKAGE, LIVING_POPULATION_CONTRACTS_PACKAGE, LIVING_POPULATION_RUNTIME_PACKAGE, WORLD_MEMORY_CONTRACTS_PACKAGE, WORLD_MEMORY_RUNTIME_PACKAGE, SOCIAL_ECOLOGY_CONTRACTS_PACKAGE, SOCIAL_ECOLOGY_RUNTIME_PACKAGE, LIVING_RHYTHMS_CONTRACTS_PACKAGE, LIVING_RHYTHMS_RUNTIME_PACKAGE, ENCOUNTER_REALIZATION_CONTRACTS_PACKAGE, ENCOUNTER_REALIZATION_RUNTIME_PACKAGE, WORLD_ADAPTATION_CONTRACTS_PACKAGE, WORLD_ADAPTATION_RUNTIME_PACKAGE, CANONICAL_EVENT_CONTRACTS_PACKAGE, CANONICAL_EVENT_RUNTIME_PACKAGE, PARTICIPATION_CONTRACTS_PACKAGE, PARTICIPATION_RUNTIME_PACKAGE, PRIVATE_REFLECTION_CONTRACTS_PACKAGE, PRIVATE_REFLECTION_RUNTIME_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", runtimePackage, "src")
    assert.ok(statSync(srcDir).isDirectory(), `expected packages/${runtimePackage}/src to exist`)
    assert.ok(listSourceFiles(srcDir).length > 0, `expected packages/${runtimePackage}/src to contain source files`)
  }
})
