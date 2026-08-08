// Sprint 8, Phase 8: a renderer-neutral sensory cue -- describes INTENT
// ("distant-birds"), never implementation (no audio file path, no
// Niagara/particle system reference). `semantic` values here must trace
// back to an already-authored source (an ExperienceDescription's own
// soundscape.motifs, biome, or atmosphere.quality) -- this module never
// invents new sensory content on a world's behalf.
export type SensoryChannel = "visual" | "ambientAudio" | "spatialAudio" | "motion" | "haptic" | "environmental"

export interface SensoryCue {
  channel: SensoryChannel
  semantic: string
}
