import type { LocationExperience } from "./experienceDescription.ts"

// The renderer boundary itself:
//
//   World Artifact -> Experience Description -> Renderer Contract -> Renderer Adapter
//
// A RendererAdapter is anything that can turn a renderer-neutral
// LocationExperience into its own technology's output (React tree, Unreal
// level state, whatever) -- this package defines only the contract, never
// an implementation. A web renderer, an Unreal renderer, and a mobile
// renderer are each a different RendererAdapter<TOutput> satisfying the
// same interface with a different TOutput and a different capability set.

export interface RendererCapabilities {
  supportsAmbientMotion: boolean
  supportsSound: boolean
  supportsReducedMotion: boolean
}

export interface PresentationContext {
  reducedMotionPreferred: boolean
  soundEnabled: boolean
}

// What a renderer actually receives once its own declared capabilities
// have been negotiated against the authored intent -- e.g. a renderer
// with `supportsSound: false` never receives soundscape motifs to act on,
// rather than receiving them and being trusted to ignore them correctly.
export interface PresentationPlan {
  locationId: LocationExperience["id"]
  environment: LocationExperience["environment"]
  atmosphere: LocationExperience["atmosphere"]
  time: LocationExperience["time"]
  presentation: LocationExperience["presentation"]
  soundscape: { motifs: string[] } | null
  ambientMotionEnabled: boolean
}

export interface RendererAdapter<TOutput> {
  capabilities(): RendererCapabilities
  present(plan: PresentationPlan): TOutput
}

// Pure negotiation: authored intent + a renderer's own declared
// capabilities + the current viewer's own preferences/settings ->
// what that renderer is actually allowed to act on. Runs the same way
// regardless of which RendererAdapter calls it -- no renderer-specific
// behavior lives here, only the negotiation rule itself. This is also
// the answer to "what happens when a renderer lacks a capability the
// authored intent assumes": the field is dropped from the plan, never
// passed through and never thrown as an error.
export function resolvePresentationPlan(
  location: LocationExperience,
  capabilities: RendererCapabilities,
  context: PresentationContext,
): PresentationPlan {
  const soundAllowed = capabilities.supportsSound && context.soundEnabled && location.soundscape.motifs.length > 0
  const motionAllowed =
    capabilities.supportsAmbientMotion && !(capabilities.supportsReducedMotion && context.reducedMotionPreferred)

  return {
    locationId: location.id,
    environment: location.environment,
    atmosphere: location.atmosphere,
    time: location.time,
    presentation: location.presentation,
    soundscape: soundAllowed ? { motifs: location.soundscape.motifs } : null,
    ambientMotionEnabled: motionAllowed,
  }
}
