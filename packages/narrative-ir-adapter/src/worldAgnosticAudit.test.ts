import { test } from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

// T10: production src/ must contain no domain-specific vocabulary --
// generic-genericity is a hard requirement (I10), not a style preference.
// Fixtures and test files are explicitly exempt (see test/fixtures/).
const FORBIDDEN_TERMS = [
  "living symphony",
  "between heartbeats",
  "first breath",
  "empty chair",
  "way home",
  "hospital",
  "heartbeat",
  "water",
  "animal",
  "chair",
  "vrindavan",
]

test("T10: production src/ contains no Living-Symphony-specific vocabulary", () => {
  const srcDir = path.dirname(fileURLToPath(import.meta.url))
  const productionFiles = readdirSync(srcDir).filter(name => name.endsWith(".ts") && !name.endsWith(".test.ts"))

  assert.ok(productionFiles.length > 0, "expected at least one production source file to audit")

  for (const file of productionFiles) {
    const contents = readFileSync(path.join(srcDir, file), "utf8").toLowerCase()
    for (const term of FORBIDDEN_TERMS) {
      assert.ok(!contents.includes(term), `${file} contains forbidden domain term "${term}"`)
    }
  }
})
