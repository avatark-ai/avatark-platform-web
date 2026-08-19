import { test } from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const FORBIDDEN_IMPORT_PREFIXES = [
  "@avatark/living-population",
  "@avatark/encounter-realization",
  "@avatark/world-memory",
  "@avatark/living-systems-runtime",
  "@avatark/narrative-runtime",
  "@avatark/world-embodiment", // Unreal-facing renderer/embodiment layer
  "@avatark/renderer-contracts",
  "@avatark/world-experience", // carries Unreal-contract-pack-adjacent shapes
]

test("boundary: this package declares zero runtime dependencies", () => {
  const packageJsonPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json")
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"))
  assert.equal(pkg.dependencies, undefined, "package.json must declare no runtime dependencies")
})

// Checks actual import/require specifiers only -- prose comments are free to
// name studiok-specifications or a package for documentation purposes (see
// artifactReference.ts); only a real code dependency is forbidden.
const IMPORT_SPECIFIER = /(?:from\s+|require\()\s*["']([^"']+)["']/g

test("boundary: production src/ imports none of the forbidden runtime packages", () => {
  const srcDir = path.dirname(fileURLToPath(import.meta.url))
  const productionFiles = readdirSync(srcDir).filter(name => name.endsWith(".ts") && !name.endsWith(".test.ts"))

  for (const file of productionFiles) {
    const contents = readFileSync(path.join(srcDir, file), "utf8")
    const specifiers = [...contents.matchAll(IMPORT_SPECIFIER)].map(m => m[1])

    for (const specifier of specifiers) {
      assert.ok(
        !FORBIDDEN_IMPORT_PREFIXES.some(forbidden => specifier.startsWith(forbidden)),
        `${file} imports forbidden package "${specifier}"`,
      )
      assert.ok(!specifier.includes("studiok-specifications"), `${file} imports studiok-specifications as a code dependency`)
    }
  }
})
