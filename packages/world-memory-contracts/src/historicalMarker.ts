import type { LocationId, WorldId } from "@avatark/runtime-contracts"
import type { HistoricalMarkerId } from "./ids.ts"
import type { MemoryProvenance } from "./provenance.ts"

// Sprint 11, Phase 8: a durable, location-scoped consequence record --
// "something historically notable happened here" -- produced by a
// WorldEvent's own LOCATION_HISTORY_MARKER consequence, never authored
// directly.
export interface HistoricalMarker {
  id: HistoricalMarkerId
  worldId: WorldId
  locationId: LocationId
  tick: number
  category: string
  detail: Record<string, string | number | boolean>
  provenance: MemoryProvenance
}

export interface HistoricalMarkerRepository {
  append(marker: HistoricalMarker): Promise<{ status: "appended" | "duplicate_ignored" }>
  listByLocation(worldId: WorldId, locationId: LocationId): Promise<HistoricalMarker[]>
}

// Sprint 11, Phase 5: a QUERY-facing projection, never itself stored --
// "is there a historical condition at this location relevant to current
// state right now" (e.g. "this location was the site of a resource
// scarcity event within the last N ticks"). Computed on demand from
// HistoricalMarker/WorldEvent history, in world-memory-runtime.
export interface HistoricalCondition {
  locationId: LocationId
  category: string
  lastOccurredTick: number
  stillRelevant: boolean
}
