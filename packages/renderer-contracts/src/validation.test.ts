import { test } from "node:test"
import assert from "node:assert/strict"
import { isValidExperienceDescription, validateExperienceDescription } from "./validation.ts"
import type { ExperienceDescription } from "./experienceDescription.ts"

function validDoc(): ExperienceDescription {
  return {
    schemaVersion: "1.0.0",
    world: "living-vrindavan",
    locations: [
      {
        id: "vrindavan-entry",
        environment: { biome: "threshold" },
        atmosphere: { quality: "arrival" },
        time: { preferredState: "unspecified" },
        soundscape: { motifs: [] },
        interaction: { reflectionAvailable: false },
        presentation: { intensity: "restrained", pacing: "slow" },
      },
      {
        id: "yamuna",
        environment: { biome: "riverbank" },
        atmosphere: { quality: "contemplative" },
        time: { preferredState: "unspecified" },
        soundscape: { motifs: ["flowing-water"] },
        interaction: { reflectionAvailable: true },
        presentation: { intensity: "restrained", pacing: "slow" },
      },
    ],
    transitions: [{ from: "vrindavan-entry", to: "yamuna", affordance: "threshold-crossing" }],
    provenance: {
      canonDocIds: ["STK-CAN-001"],
      canonVersion: "0.1.0",
      specId: "STK-SPEC-004",
      specVersion: 1,
      worldArtifactSpecId: "STK-SPEC-002",
      generatedAt: "2026-08-08",
    },
  }
}

test("a well-formed experience description validates clean", () => {
  const errors = validateExperienceDescription(validDoc())
  assert.deepEqual(errors, [])
  assert.equal(isValidExperienceDescription(validDoc()), true)
})

test("rejects a non-object", () => {
  const errors = validateExperienceDescription(null)
  assert.equal(errors.length, 1)
  assert.match(errors[0].message, /must be an object/)
})

test("rejects a wrong schemaVersion", () => {
  const doc = validDoc()
  ;(doc as { schemaVersion: string }).schemaVersion = "2.0.0"
  const errors = validateExperienceDescription(doc)
  assert.ok(errors.some((e) => /schemaVersion/.test(e.message)))
})

test("rejects an invalid time.preferredState", () => {
  const doc = validDoc()
  ;(doc.locations[0].time as { preferredState: string }).preferredState = "sunset"
  const errors = validateExperienceDescription(doc)
  assert.ok(errors.some((e) => /time.preferredState/.test(e.message)))
})

test("rejects an invalid presentation.intensity", () => {
  const doc = validDoc()
  ;(doc.locations[0].presentation as { intensity: string }).intensity = "extreme"
  const errors = validateExperienceDescription(doc)
  assert.ok(errors.some((e) => /presentation.intensity/.test(e.message)))
})

test("rejects a transition referencing an unknown location", () => {
  const doc = validDoc()
  doc.transitions.push({ from: "yamuna", to: "nonexistent", affordance: "gradual-emergence" })
  const errors = validateExperienceDescription(doc)
  assert.ok(errors.some((e) => /unknown location "nonexistent"/.test(e.message)))
})

test("rejects a duplicate location id", () => {
  const doc = validDoc()
  doc.locations.push({ ...doc.locations[0] })
  const errors = validateExperienceDescription(doc)
  assert.ok(errors.some((e) => /duplicate location id/.test(e.message)))
})

test("rejects missing provenance.specId", () => {
  const doc = validDoc()
  ;(doc.provenance as { specId?: string }).specId = undefined
  const errors = validateExperienceDescription(doc)
  assert.ok(errors.some((e) => /provenance.specId/.test(e.message)))
})
