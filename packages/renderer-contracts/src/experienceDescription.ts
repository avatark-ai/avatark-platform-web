import type { LocationId, WorldId } from "@avatark/runtime-contracts"

// Renderer-neutral experience-intent types. Mirrors
// studiok-specifications' experience-description.schema.json (STK-SPEC-003)
// field-for-field -- this file is the TypeScript shape of that JSON
// contract, not an independent invention. No field here may describe a
// React component, CSS class, DOM structure, Next.js route, Unreal
// Actor/Blueprint, Nanite/Lumen setting, or PCG graph; those belong to a
// RendererAdapter (see rendererContract.ts), never here.

export type TimePreference = "unspecified" | "dawn" | "midday" | "twilight" | "night"

export type TransitionAffordance = "threshold-crossing" | "gradual-emergence" | "branching-choice"

export type PresentationIntensity = "restrained" | "standard"

export type PresentationPacing = "slow" | "moderate"

export interface LocationExperience {
  id: LocationId
  environment: { biome: string }
  atmosphere: { quality: string }
  time: { preferredState: TimePreference }
  soundscape: { motifs: string[] }
  interaction: { reflectionAvailable: boolean }
  presentation: { intensity: PresentationIntensity; pacing: PresentationPacing }
}

export interface ExperienceTransition {
  from: LocationId
  to: LocationId
  affordance: TransitionAffordance
}

export interface ExperienceProvenance {
  canonDocIds: string[]
  canonVersion: string
  specId: string
  specVersion: number
  worldArtifactSpecId: string
  generatedAt: string
}

export interface ExperienceDescription {
  schemaVersion: string
  world: WorldId
  locations: LocationExperience[]
  transitions: ExperienceTransition[]
  provenance: ExperienceProvenance
}
