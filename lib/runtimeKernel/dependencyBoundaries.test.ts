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

test("sanity: this check actually inspects real directories, not an accidental no-op", () => {
  for (const runtimePackage of [...RUNTIME_PACKAGES, CONTRACTS_PACKAGE, RENDERER_CONTRACTS_PACKAGE, LIVING_SYSTEMS_CONTRACTS_PACKAGE, LIVING_SYSTEMS_RUNTIME_PACKAGE, WORLD_EMBODIMENT_CONTRACTS_PACKAGE, WORLD_EMBODIMENT_RUNTIME_PACKAGE, WORLD_PERSISTENCE_CONTRACTS_PACKAGE, WORLD_PERSISTENCE_RUNTIME_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", runtimePackage, "src")
    assert.ok(statSync(srcDir).isDirectory(), `expected packages/${runtimePackage}/src to exist`)
    assert.ok(listSourceFiles(srcDir).length > 0, `expected packages/${runtimePackage}/src to contain source files`)
  }
})
