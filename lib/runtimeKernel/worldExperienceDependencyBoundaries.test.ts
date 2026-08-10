import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

// Build 04: the same static dependency-boundary enforcement
// lib/runtimeKernel/dependencyBoundaries.test.ts already holds for
// every prior Sprint's contracts/runtime pair, applied to the two new
// packages this build adds. Kept as its own file rather than growing
// that already-1000+-line file further -- an equally valid, additive
// way to apply the same discipline (per this project's own "many small
// proof files" convention every prior sprint/build already uses).
const REPO_ROOT = join(import.meta.dirname, "..", "..")
const CONTRACTS_PACKAGE = "world-experience-contracts"
const RUNTIME_PACKAGE = "world-experience-runtime"
const CONTRACTS_ALLOWED_DEPS = new Set([
  "@avatark/runtime-contracts",
  "@avatark/spatial-ecology-contracts",
  "@avatark/world-embodiment-contracts",
  "@avatark/canonical-event-contracts",
  "@avatark/world-memory-contracts",
  "@avatark/living-rhythms-contracts",
])
const RUNTIME_ALLOWED_DEPS = new Set([...CONTRACTS_ALLOWED_DEPS, "@avatark/world-experience-contracts"])

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

test("packages/world-experience-contracts declares, at most, its six allowed contracts-package dependencies", () => {
  const deps = packageDependencies(CONTRACTS_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !CONTRACTS_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `world-experience-contracts declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/world-experience-contracts imports, at most, those same six packages in its source", () => {
  const srcDir = join(REPO_ROOT, "packages", CONTRACTS_PACKAGE, "src")
  const allowed = new Set([...CONTRACTS_ALLOWED_DEPS].map((dep) => dep.replace("@avatark/", "")))
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("packages/world-experience-runtime declares, at most, its seven allowed dependencies -- zero sibling RUNTIME package", () => {
  const deps = packageDependencies(RUNTIME_PACKAGE)
  const disallowed = Object.keys(deps).filter((name) => !RUNTIME_ALLOWED_DEPS.has(name))
  assert.deepEqual(disallowed, [], `world-experience-runtime declares disallowed dependencies: ${disallowed.join(", ")}`)
})

test("packages/world-experience-runtime imports, at most, those same seven packages in its production source -- never a sibling runtime, renderer, or @avatark/account", () => {
  const srcDir = join(REPO_ROOT, "packages", RUNTIME_PACKAGE, "src")
  const allowed = new Set([...RUNTIME_ALLOWED_DEPS].map((dep) => dep.replace("@avatark/", "")))
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    if (file.endsWith(".test.ts")) continue
    for (const importedPackage of findAvatarkImports(file)) {
      if (!allowed.has(importedPackage)) violations.push(`${file} imports @avatark/${importedPackage}`)
    }
  }
  assert.deepEqual(violations, [])
})

test("neither world-experience package's production source contains a React/Next.js/Unreal-specific token", () => {
  const forbidden = ["from \"react", "from 'react", "next/server", "next/navigation", "UObject", "AActor", "Blueprint", "UnrealEngine"]
  const violations: string[] = []
  for (const pkg of [CONTRACTS_PACKAGE, RUNTIME_PACKAGE]) {
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

test("packages/world-experience-runtime never references protected narrative state at all -- this domain never reads or writes it", () => {
  const srcDir = join(REPO_ROOT, "packages", RUNTIME_PACKAGE, "src")
  const violations: string[] = []
  for (const file of listSourceFiles(srcDir)) {
    if (file.endsWith(".test.ts")) continue
    const content = readFileSync(file, "utf-8")
    if (/protectedNarrative/i.test(content)) violations.push(file)
  }
  assert.deepEqual(violations, [])
})
