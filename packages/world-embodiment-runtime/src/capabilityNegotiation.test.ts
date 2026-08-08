import { test } from "node:test"
import assert from "node:assert/strict"
import { negotiateRegionForCapabilities } from "./capabilityNegotiation.ts"
import { MINIMAL_EMBODIMENT_CAPABILITIES } from "@avatark/world-embodiment-contracts"
import type { EmbodiedRegion, EmbodimentRendererCapabilities } from "@avatark/world-embodiment-contracts"

function makeRegion(cues: { channel: string; semantic: string }[]): EmbodiedRegion {
  return {
    locationId: "yamuna",
    name: "Yamuna",
    spatialNode: { id: "yamuna", parentId: null, role: "location", transform: { position: { x: 0, y: 0, z: 0 } }, bounds: { radius: 2 }, tags: [] },
    environment: {
      atmosphere: { semantic: "contemplative", temperatureBand: "moderate", illuminationSemantic: "unspecified" },
      water: { semantic: "flowing", levelBand: "moderate" },
      vegetation: { semantic: "dense-riverbank", densityBand: "high" },
      sensoryCues: cues as never,
    },
    entities: [],
    encounters: [],
  }
}

const FULL_CAPABILITIES: EmbodimentRendererCapabilities = {
  spatial3D: true,
  ambientAudio: true,
  spatialAudio: true,
  animation: true,
  particles: true,
  dynamicLighting: true,
  haptics: true,
  vegetationInstances: true,
  waterSurface: true,
  largeWorldStreaming: true,
}

test("a renderer with full capabilities keeps every authored sensory cue", () => {
  const region = makeRegion([{ channel: "ambientAudio", semantic: "flowing-water" }])
  const negotiated = negotiateRegionForCapabilities(region, FULL_CAPABILITIES)
  assert.deepEqual(negotiated.environment.sensoryCues, region.environment.sensoryCues)
})

test("a renderer without ambientAudio never receives an ambientAudio cue, even if authored", () => {
  const region = makeRegion([{ channel: "ambientAudio", semantic: "flowing-water" }])
  const negotiated = negotiateRegionForCapabilities(region, MINIMAL_EMBODIMENT_CAPABILITIES)
  assert.deepEqual(negotiated.environment.sensoryCues, [])
})

test("MINIMAL_EMBODIMENT_CAPABILITIES (everything false) never throws and always degrades to zero sensory cues", () => {
  const region = makeRegion([
    { channel: "ambientAudio", semantic: "flowing-water" },
    { channel: "spatialAudio", semantic: "birdsong" },
    { channel: "motion", semantic: "ripple" },
    { channel: "haptic", semantic: "pulse" },
  ])
  assert.doesNotThrow(() => negotiateRegionForCapabilities(region, MINIMAL_EMBODIMENT_CAPABILITIES))
  const negotiated = negotiateRegionForCapabilities(region, MINIMAL_EMBODIMENT_CAPABILITIES)
  assert.deepEqual(negotiated.environment.sensoryCues, [])
})

test("negotiation never alters semantic world truth -- environment bands/semantics, entities, and encounters pass through unchanged", () => {
  const region = makeRegion([{ channel: "ambientAudio", semantic: "flowing-water" }])
  const negotiated = negotiateRegionForCapabilities(region, MINIMAL_EMBODIMENT_CAPABILITIES)
  assert.equal(negotiated.environment.water.semantic, region.environment.water.semantic)
  assert.equal(negotiated.environment.vegetation.densityBand, region.environment.vegetation.densityBand)
  assert.deepEqual(negotiated.entities, region.entities)
  assert.deepEqual(negotiated.encounters, region.encounters)
})

test("a visual/environmental cue (no dedicated capability gate) always passes through", () => {
  const region = makeRegion([{ channel: "visual", semantic: "golden-hour-glow" }])
  const negotiated = negotiateRegionForCapabilities(region, MINIMAL_EMBODIMENT_CAPABILITIES)
  assert.deepEqual(negotiated.environment.sensoryCues, region.environment.sensoryCues)
})
