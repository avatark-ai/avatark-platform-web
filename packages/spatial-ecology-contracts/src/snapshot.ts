import type { WorldId } from "@avatark/runtime-contracts"
import type { PatchState } from "./patchState.ts"
import type { TerritoryPressure } from "./territory.ts"
import type { RouteState } from "./route.ts"

// Sprint 16's own renderer-neutral read -- the spatial-domain analogue
// of Sprint 7's WorldSnapshot / Sprint 10's PopulationSnapshot: always
// resolved FRESH from authoritative state (never a second store in its
// own right). Composed by the Host layer for a renderer adapter to
// consume; contains no renderer object of any kind.
export interface SpatialSnapshot {
  worldId: WorldId
  tick: number
  patchStates: PatchState[]
  territoryPressures: TerritoryPressure[]
  routeStates: RouteState[]
}

export type SpatialDeltaEntryKind = "patch" | "territoryPressure" | "route"

export interface SpatialDeltaEntry {
  kind: SpatialDeltaEntryKind
  id: string
  before: PatchState | TerritoryPressure | RouteState | null
  after: PatchState | TerritoryPressure | RouteState | null
}

// A two-snapshot diff, the same "renderer receives a delta, never a
// tick replay" discipline @avatark/world-embodiment-runtime's own
// `diffWorldEmbodiment` already established (Sprint 8) -- computed by
// @avatark/spatial-ecology-runtime's own `diffSpatialSnapshot`, never
// stored.
export interface SpatialDelta {
  worldId: WorldId
  fromTick: number
  toTick: number
  entries: SpatialDeltaEntry[]
}
