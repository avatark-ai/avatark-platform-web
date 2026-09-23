import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { CONTRACT_OWNERSHIP, FORBIDDEN_CONSUMER_FIELD_NAMES, forbiddenFieldsIn, isSupportedSchemaVersion, WORLD_CONSUMER_CONTRACT_VERSION } from "./index.ts"

const schemaDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../schemas/v1")

// SHA-256 of the frozen WORLDK-M07 pack files (identical to worldk-web's vendored copy).
const M07_SHA256: Record<string, string> = {
  "common.schema.json": "18ac31bb16d50fb7c693705e17a5db01b0fc1942888c867b25ed5f4e63cdad21",
  "living-forest-identity.json": "eafe975fb9b39e396929034e969c8faeb55448637b9919aa0b135e5fb6efcc6d",
  "public-world-projection.schema.json": "9cad75deb0896ccaf81d8cede0a76eb70979ddbef49504db23e5a0a59766020a",
  "streamk-worldk-narrative-context.schema.json": "279147362bf8e7d336a1d50382bf59c39afa2a2784239cb357a979770aad1e22",
  "visitor-world-projection.schema.json": "d9b318189bfd252a986c93b5923c860c5cd52a52e3dc8a85eea5f5855a32e905",
  "world-entry.schema.json": "b5b10a484a40ca0eb65c130ae2cadd613cc9574ee14259c25802d343cab07a8e",
}

test("schemas/v1 are byte-identical to the frozen M07 contract pack", () => {
  for (const [file, sha] of Object.entries(M07_SHA256)) {
    const actual = createHash("sha256").update(readFileSync(path.join(schemaDir, file))).digest("hex")
    assert.equal(actual, sha, file)
  }
  const recorded = readFileSync(path.join(schemaDir, "CHECKSUMS.sha256"), "utf8").trim().split("\n")
  assert.equal(recorded.length, Object.keys(M07_SHA256).length)
})

test("contract version 1.0; consumers accept any 1.x", () => {
  assert.equal(WORLD_CONSUMER_CONTRACT_VERSION, "1.0")
  assert.ok(isSupportedSchemaVersion("1.0") && isSupportedSchemaVersion("1.7"))
  assert.ok(!isSupportedSchemaVersion("2.0") && !isSupportedSchemaVersion(1))
})

test("ownership: AvatarK Platform owns every contract; WorldK is only ever a consumer", () => {
  assert.equal(CONTRACT_OWNERSHIP.length, 4)
  for (const c of CONTRACT_OWNERSHIP) {
    assert.equal(c.owner, "AvatarK Platform")
    assert.ok(c.consumers.includes("WorldK"))
    assert.ok(!/worldk/i.test(c.producer), `${c.contract} producer must not be WorldK`)
  }
  assert.equal(CONTRACT_OWNERSHIP.find((c) => c.contract === "streamk-worldk-narrative-context")?.worldStateAuthority, "NONE")
  assert.equal(CONTRACT_OWNERSHIP.find((c) => c.contract === "visitor-world-projection")?.privacy, "PRIVATE")
})

test("forbidden-field scanner finds nested runtime/infrastructure keys", () => {
  assert.deepEqual(forbiddenFieldsIn({ a: [{ b: { gpuId: 1 } }], visitorContext: {} }).sort(), ["gpuId", "visitorContext"])
  assert.deepEqual(forbiddenFieldsIn({ placeId: "x", subjectId: "y" }), [])
  for (const k of ["userId", "simulationTick", "worldInstanceId", "leaseVersion", "region", "renderer", "unrealProcess", "serviceRoleKey"]) {
    assert.ok(FORBIDDEN_CONSUMER_FIELD_NAMES.includes(k), k)
  }
})

test("package imports no runtime, kernel, compiler or infrastructure module", () => {
  const src = ["index.ts", "types.ts", "ownership.ts", "forbiddenFields.ts"].map((f) => readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), f), "utf8")).join("\n")
  const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1])
  assert.ok(imports.every((i) => i.startsWith("./")), `unexpected imports: ${imports.join(", ")}`)
})
