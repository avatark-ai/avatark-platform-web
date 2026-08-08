import type { LocationId, UserId, WorldId } from "@avatark/runtime-contracts"
import type { AvailableEncounter } from "./encounter.ts"
import type { EcologyState, HydrologyState, WeatherState } from "./environmentalState.ts"
import type { LivingEntityState } from "./entity.ts"
import type { ProtectedNarrativeProjection } from "./protectedNarrative.ts"
import type { SeasonId } from "./ids.ts"

// Sprint 7, Phase 12: the canonical RENDERER-FACING snapshot. A renderer
// receives this, never the internal SharedWorldState/LivingEntityState[]/
// VisitorWorldMemory it was resolved from. Every field is `readonly`, and
// `freezeWorldSnapshot` enforces that at runtime too (TS `readonly` is
// compile-time only) -- a renderer that tries to mutate a snapshot fails
// immediately, not silently.
export interface VisitorContextProjection {
  readonly userId: UserId
  readonly lastLocationId: LocationId | null
  readonly meaningfulEncounterCount: number
  readonly reflectionCount: number
}

export interface WorldSnapshotProvenance {
  readonly worldArtifactSpecId: string
  readonly systemsArtifactSpecId: string
  readonly canonDocIds: readonly string[]
}

export interface WorldSnapshot {
  readonly worldId: WorldId
  readonly worldVersion: number
  readonly simulationTick: number
  readonly locationId: LocationId
  readonly season: { readonly id: SeasonId; readonly name: string }
  readonly weather: Readonly<WeatherState>
  readonly hydrology: Readonly<HydrologyState>
  readonly ecology: Readonly<EcologyState>
  readonly presentEntities: readonly Readonly<LivingEntityState>[]
  readonly availableEncounters: readonly Readonly<AvailableEncounter>[]
  readonly visitorContext: VisitorContextProjection
  readonly protectedNarrative: Readonly<ProtectedNarrativeProjection>
  readonly generatedAt: string
  readonly provenance: WorldSnapshotProvenance
}

export function freezeWorldSnapshot(snapshot: WorldSnapshot): WorldSnapshot {
  Object.freeze(snapshot.season)
  Object.freeze(snapshot.weather)
  Object.freeze(snapshot.hydrology)
  Object.freeze(snapshot.ecology)
  snapshot.presentEntities.forEach((e) => Object.freeze(e))
  Object.freeze(snapshot.presentEntities)
  snapshot.availableEncounters.forEach((e) => Object.freeze(e))
  Object.freeze(snapshot.availableEncounters)
  Object.freeze(snapshot.visitorContext)
  Object.freeze(snapshot.protectedNarrative)
  Object.freeze(snapshot.provenance.canonDocIds)
  Object.freeze(snapshot.provenance)
  return Object.freeze(snapshot)
}
