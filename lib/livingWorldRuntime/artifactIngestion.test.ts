import { test } from "node:test"
import assert from "node:assert/strict"
import { getManifestEntry, listExecutingArtifacts, verifyArtifactIngestion } from "./artifactIngestion.ts"

test("listExecutingArtifacts answers 'which StudioK artifact am I executing?' with full provenance", () => {
  const artifacts = listExecutingArtifacts()
  assert.ok(artifacts.length >= 2)
  const world = artifacts.find((a) => a.artifactId === "living-vrindavan.world")
  const experience = artifacts.find((a) => a.artifactId === "living-vrindavan.experience")
  assert.ok(world, "expected a manifest entry for living-vrindavan.world")
  assert.ok(experience, "expected a manifest entry for living-vrindavan.experience")
  assert.equal(world?.specId, "STK-SPEC-002")
  assert.equal(experience?.specId, "STK-SPEC-004")
  assert.ok(world?.canonDocIds.includes("STK-CAN-001"))
})

test("getManifestEntry returns undefined for an artifact id never ingested", () => {
  assert.equal(getManifestEntry("nonexistent-artifact"), undefined)
})

test("verifyArtifactIngestion passes for the real vendored world artifact", () => {
  const result = verifyArtifactIngestion("living-vrindavan.world", "1.0.0")
  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
})

test("verifyArtifactIngestion passes for the real vendored experience artifact", () => {
  const result = verifyArtifactIngestion("living-vrindavan.experience", "1.0.0")
  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
})

test("verifyArtifactIngestion fails for an artifact id with no manifest entry", () => {
  const result = verifyArtifactIngestion("nonexistent-artifact", "1.0.0")
  assert.equal(result.valid, false)
  assert.equal(result.entry, undefined)
  assert.match(result.errors[0], /never recorded/)
})

test("verifyArtifactIngestion fails a schema-version incompatibility", () => {
  const result = verifyArtifactIngestion("living-vrindavan.world", "2.0.0")
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => /incompatible/.test(e)))
})
