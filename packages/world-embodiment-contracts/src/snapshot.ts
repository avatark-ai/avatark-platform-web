import type { ProtectedNarrativeProjection, VisitorContextProjection } from "@avatark/living-systems-contracts"
import type { TransitionAffordance } from "@avatark/renderer-contracts"
import type { LocationId, WorldId } from "@avatark/runtime-contracts"
import type { EmbodiedRegion } from "./embodiedRegion.ts"

export interface EmbodiedTransition {
  toLocationId: LocationId
  affordance: TransitionAffordance | null
}

export interface WorldEmbodimentProvenance {
  readonly worldArtifactSpecId: string
  readonly experienceArtifactSpecId: string
  readonly systemsArtifactSpecId: string
  readonly canonDocIds: readonly string[]
}

// Sprint 8, Phase 3/24: the canonical renderer-facing embodiment
// snapshot -- scoped to the visitor's current location plus its legal
// next locations (same scoping precedent WorldSnapshot and
// AccountLivingWorldSummary.nextLocations already established in
// Sprint 5-7), not a full-world region graph traversed every call.
// `protectedNarrative`/`visitorContext` pass through from the source
// WorldSnapshot UNCHANGED (Phase 15: embodiment may present them, never
// alter them) -- this type reuses those exact contract types rather than
// redeclaring parallel ones.
export interface WorldEmbodimentSnapshot {
  readonly worldId: WorldId
  readonly worldVersion: number
  readonly simulationTick: number
  readonly season: { readonly id: string; readonly name: string }
  readonly current: Readonly<EmbodiedRegion>
  readonly reachable: readonly Readonly<EmbodiedRegion>[]
  readonly transitions: readonly Readonly<EmbodiedTransition>[]
  readonly visitorContext: VisitorContextProjection
  readonly protectedNarrative: Readonly<ProtectedNarrativeProjection>
  readonly generatedAt: string
  readonly provenance: WorldEmbodimentProvenance
}

export function freezeWorldEmbodimentSnapshot(snapshot: WorldEmbodimentSnapshot): WorldEmbodimentSnapshot {
  const freezeRegion = (region: EmbodiedRegion) => {
    Object.freeze(region.spatialNode.transform.position)
    Object.freeze(region.spatialNode.transform)
    Object.freeze(region.spatialNode.bounds)
    Object.freeze(region.spatialNode.tags)
    Object.freeze(region.spatialNode)
    Object.freeze(region.environment.atmosphere)
    Object.freeze(region.environment.water)
    Object.freeze(region.environment.vegetation)
    region.environment.sensoryCues.forEach((c) => Object.freeze(c))
    Object.freeze(region.environment.sensoryCues)
    Object.freeze(region.environment)
    region.entities.forEach((e) => Object.freeze(e))
    Object.freeze(region.entities)
    region.encounters.forEach((e) => Object.freeze(e))
    Object.freeze(region.encounters)
    return Object.freeze(region)
  }

  freezeRegion(snapshot.current)
  snapshot.reachable.forEach((r) => freezeRegion(r))
  Object.freeze(snapshot.reachable)
  snapshot.transitions.forEach((t) => Object.freeze(t))
  Object.freeze(snapshot.transitions)
  Object.freeze(snapshot.season)
  Object.freeze(snapshot.visitorContext)
  Object.freeze(snapshot.protectedNarrative)
  Object.freeze(snapshot.provenance.canonDocIds)
  Object.freeze(snapshot.provenance)
  return Object.freeze(snapshot)
}
