// Test helper: validates payloads against the FROZEN M07 v1 schemas shipped
// in @avatark/world-consumer-contracts/schemas/v1 (never a local copy).
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import Ajv from "ajv"
import addFormats from "ajv-formats"

const here = path.dirname(fileURLToPath(import.meta.url))
export const SCHEMA_DIR = path.resolve(here, "../../../packages/world-consumer-contracts/schemas/v1")

export const SCHEMA = {
  public: "public-world-projection.schema.json",
  visitor: "visitor-world-projection.schema.json",
  entry: "world-entry.schema.json",
  narrative: "streamk-worldk-narrative-context.schema.json",
} as const

const FILES = ["common.schema.json", SCHEMA.narrative, SCHEMA.public, SCHEMA.visitor, SCHEMA.entry]

export function createContractValidator() {
  const ajv = new Ajv({ allErrors: true, strict: false })
  addFormats(ajv)
  for (const f of FILES) ajv.addSchema(JSON.parse(readFileSync(path.join(SCHEMA_DIR, f), "utf8")), f)
  return {
    validate(schema: string, payload: unknown): { ok: boolean; errors: string } {
      const ok = ajv.validate(schema, payload) as boolean
      return { ok, errors: ok ? "" : JSON.stringify(ajv.errors, null, 1) }
    },
  }
}
