import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url))

// Patterns that would indicate this package assumes a specific Supabase
// project, ships a credential, or otherwise stops being host-neutral.
const FORBIDDEN_PATTERNS = [
  /supabase\.co/i,
  /service_role/i,
  /eyJ[a-zA-Z0-9_-]{10,}/, // JWT-shaped literal
  /NEXT_PUBLIC_SUPABASE/,
  /process\.env\./,
]

function sourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    // copy.ts intentionally lists forbidden phrases as data (FORBIDDEN_DIAGNOSTIC_PHRASES)
    // for other tests to check against -- it is not itself a leak.
    if (entry.name === "copy.ts") return []
    if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) return [full]
    return []
  })
}

test("no auth-ui source file references a Supabase project, credential, or env var directly", () => {
  for (const file of sourceFiles(SRC_DIR)) {
    const content = readFileSync(file, "utf8")
    for (const pattern of FORBIDDEN_PATTERNS) {
      assert.ok(!pattern.test(content), `${path.basename(file)} matched forbidden pattern ${pattern}`)
    }
  }
})

test("AuthUnavailableState component accepts no reason/detail prop that could carry a technical message", () => {
  const content = readFileSync(path.join(SRC_DIR, "AuthUnavailableState.tsx"), "utf8")
  assert.ok(!/reason|detail|message:/i.test(content.replace(/\/\/.*$/gm, "")), "AuthUnavailableState must not accept a technical-detail prop")
})
