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

test("sanity: this check actually inspects real directories, not an accidental no-op", () => {
  for (const runtimePackage of [...RUNTIME_PACKAGES, CONTRACTS_PACKAGE, RENDERER_CONTRACTS_PACKAGE]) {
    const srcDir = join(REPO_ROOT, "packages", runtimePackage, "src")
    assert.ok(statSync(srcDir).isDirectory(), `expected packages/${runtimePackage}/src to exist`)
    assert.ok(listSourceFiles(srcDir).length > 0, `expected packages/${runtimePackage}/src to contain source files`)
  }
})
