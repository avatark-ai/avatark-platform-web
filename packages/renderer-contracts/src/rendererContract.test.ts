import { test } from "node:test"
import assert from "node:assert/strict"
import { resolvePresentationPlan } from "./rendererContract.ts"
import type { LocationExperience, RendererAdapter, RendererCapabilities } from "./index.ts"

const yamuna: LocationExperience = {
  id: "yamuna",
  environment: { biome: "riverbank" },
  atmosphere: { quality: "contemplative" },
  time: { preferredState: "unspecified" },
  soundscape: { motifs: ["flowing-water"] },
  interaction: { reflectionAvailable: true },
  presentation: { intensity: "restrained", pacing: "slow" },
}

const fullCapabilities: RendererCapabilities = {
  supportsAmbientMotion: true,
  supportsSound: true,
  supportsReducedMotion: true,
}

test("a fully-capable renderer with sound enabled and no reduced-motion preference gets the full plan", () => {
  const plan = resolvePresentationPlan(yamuna, fullCapabilities, { reducedMotionPreferred: false, soundEnabled: true })
  assert.deepEqual(plan.soundscape, { motifs: ["flowing-water"] })
  assert.equal(plan.ambientMotionEnabled, true)
})

test("a renderer without sound support never receives soundscape motifs, even if the location authors some", () => {
  const capabilities: RendererCapabilities = { ...fullCapabilities, supportsSound: false }
  const plan = resolvePresentationPlan(yamuna, capabilities, { reducedMotionPreferred: false, soundEnabled: true })
  assert.equal(plan.soundscape, null)
})

test("sound is dropped when the viewer has it disabled, independent of renderer capability", () => {
  const plan = resolvePresentationPlan(yamuna, fullCapabilities, { reducedMotionPreferred: false, soundEnabled: false })
  assert.equal(plan.soundscape, null)
})

test("a location with no authored soundscape motifs never produces a soundscape plan, even with sound fully enabled", () => {
  const silent: LocationExperience = { ...yamuna, soundscape: { motifs: [] } }
  const plan = resolvePresentationPlan(silent, fullCapabilities, { reducedMotionPreferred: false, soundEnabled: true })
  assert.equal(plan.soundscape, null)
})

test("reduced-motion preference disables ambient motion on a renderer that honors it", () => {
  const plan = resolvePresentationPlan(yamuna, fullCapabilities, { reducedMotionPreferred: true, soundEnabled: true })
  assert.equal(plan.ambientMotionEnabled, false)
})

test("a renderer that doesn't support ambient motion at all never enables it, regardless of preference", () => {
  const capabilities: RendererCapabilities = { ...fullCapabilities, supportsAmbientMotion: false }
  const plan = resolvePresentationPlan(yamuna, capabilities, { reducedMotionPreferred: false, soundEnabled: true })
  assert.equal(plan.ambientMotionEnabled, false)
})

test("an unknown/unsupported capability never throws -- negotiation degrades gracefully", () => {
  const minimalCapabilities: RendererCapabilities = {
    supportsAmbientMotion: false,
    supportsSound: false,
    supportsReducedMotion: false,
  }
  assert.doesNotThrow(() => resolvePresentationPlan(yamuna, minimalCapabilities, { reducedMotionPreferred: true, soundEnabled: true }))
})

test("RendererAdapter<TOutput> is satisfiable by a trivial adapter, proving the contract is implementable", () => {
  const stringAdapter: RendererAdapter<string> = {
    capabilities: () => fullCapabilities,
    present: (plan) => `${plan.locationId}:${plan.atmosphere.quality}`,
  }
  const plan = resolvePresentationPlan(yamuna, stringAdapter.capabilities(), { reducedMotionPreferred: false, soundEnabled: true })
  assert.equal(stringAdapter.present(plan), "yamuna:contemplative")
})
