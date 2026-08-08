// Sprint 8, Phase 10: extends Sprint 6's renderer-capability MODEL
// (declare capabilities, negotiate, degrade gracefully -- see
// @avatark/renderer-contracts' own RendererCapabilities/
// resolvePresentationPlan) rather than competing with it. Sprint 6's
// capabilities describe a single location's 2D presentation
// (motion/sound); these describe the richer spatial/3D affordances a
// world-scale embodiment adapter may or may not support. A renderer
// declares this shape in addition to, not instead of,
// RendererCapabilities when it also consumes WorldEmbodimentSnapshot.
export interface EmbodimentRendererCapabilities {
  spatial3D: boolean
  ambientAudio: boolean
  spatialAudio: boolean
  animation: boolean
  particles: boolean
  dynamicLighting: boolean
  haptics: boolean
  vegetationInstances: boolean
  waterSurface: boolean
  largeWorldStreaming: boolean
}

// A renderer missing a capability must degrade gracefully -- this
// documents the DEFAULT floor every adapter can always satisfy (semantic
// labels only, no spatial/audio/animation realization), so "everything
// false" is itself always a valid capability set, never a contradiction.
export const MINIMAL_EMBODIMENT_CAPABILITIES: EmbodimentRendererCapabilities = {
  spatial3D: false,
  ambientAudio: false,
  spatialAudio: false,
  animation: false,
  particles: false,
  dynamicLighting: false,
  haptics: false,
  vegetationInstances: false,
  waterSurface: false,
  largeWorldStreaming: false,
}
