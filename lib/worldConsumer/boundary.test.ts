import { test } from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const producerFiles = ["bindings.ts", "publicProjection.ts", "visitorProjection.ts", "continuityLedger.ts", "service.ts"]

test("producers never import embodiment, renderer, Unreal, lease/persistence, ChronicleK or @dt4m code", () => {
  for (const f of producerFiles) {
    const src = readFileSync(path.join(here, f), "utf8")
    const imports = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]!)
    for (const i of imports) {
      assert.ok(!/world-embodiment|renderer|unreal|world-persistence|chroniclek|@dt4m\//i.test(i), `${f} imports ${i}`)
    }
    assert.ok(!/WorldLease|WorldSnapshot|visitorContext|simulationTick|PixelStreaming/.test(src.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")), `${f} references a forbidden runtime concept in code`)
  }
})

test("no AI/prose model is used to produce world facts or Since-You-Were-Here summaries", () => {
  const all = readdirSync(here).filter((f) => f.endsWith(".ts") && f !== "boundary.test.ts").map((f) => readFileSync(path.join(here, f), "utf8")).join("\n")
  assert.ok(!/anthropic|openai|generateText|ai-gateway|llm/i.test(all))
})
