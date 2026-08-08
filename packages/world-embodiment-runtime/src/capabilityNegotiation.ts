import type { EmbodiedRegion, EmbodimentRendererCapabilities, SensoryCue } from "@avatark/world-embodiment-contracts"

// Sprint 8, Phase 10: extends Sprint 6's negotiation PATTERN
// (@avatark/renderer-contracts' resolvePresentationPlan) to the richer
// spatial/sensory capability set. A renderer missing a capability never
// receives the cue it can't realize -- the cue is dropped from the
// region it negotiates, never passed through to corrupt/confuse the
// adapter, and never causes a throw. Semantic world truth itself
// (environment bands/semantics, entity identity/state, encounter
// availability) is UNCHANGED by negotiation -- only sensory REALIZATION
// degrades; capability negotiation must never alter what's true, only
// what a specific renderer is handed to act on.
function negotiateSensoryCues(cues: readonly SensoryCue[], capabilities: EmbodimentRendererCapabilities): SensoryCue[] {
  return cues.filter((cue) => {
    if (cue.channel === "ambientAudio") return capabilities.ambientAudio
    if (cue.channel === "spatialAudio") return capabilities.spatialAudio
    if (cue.channel === "motion") return capabilities.animation
    if (cue.channel === "haptic") return capabilities.haptics
    return true // visual/environmental cues have no dedicated capability gate in this minimal model
  })
}

export function negotiateRegionForCapabilities(region: EmbodiedRegion, capabilities: EmbodimentRendererCapabilities): EmbodiedRegion {
  return {
    ...region,
    environment: {
      ...region.environment,
      sensoryCues: negotiateSensoryCues(region.environment.sensoryCues, capabilities),
    },
  }
}
