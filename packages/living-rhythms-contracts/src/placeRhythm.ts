import type { WorldId, LocationId } from "@avatark/runtime-contracts"
import type { DayPhase } from "./dayPhase.ts"
import type { OccupancyLevel } from "./placeOccupancy.ts"

// Sprint 13, Phase 10: a BOUNDED aggregate, never an event log -- "do
// not create telemetry exhaust" (Phase 10's own instruction) rules out
// one row per tick per location. The triple space itself
// (locationId x dayPhase x occupancyLevel) is small and finite -- at
// most 7 day phases x 5 occupancy levels = 35 counters PER LOCATION,
// incrementally updated, never replayed from a growing history (see
// docs/SPRINT13_GROUND_TRUTH.md's decision 4). This is what lets a
// visitor eventually learn "this place feels different in the morning"
// without scripting that sentence: `typicalOccupancyLevel` answers
// which occupancy level has been observed most often at a given day
// phase.
export interface PlaceRhythmCount {
  dayPhase: DayPhase
  occupancyLevel: OccupancyLevel
  observationCount: number
}

export interface PlaceRhythmProfile {
  worldId: WorldId
  locationId: LocationId
  counts: PlaceRhythmCount[]
  lastUpdatedTick: number
}

export interface PlaceRhythmRepository {
  recordObservation(worldId: WorldId, locationId: LocationId, dayPhase: DayPhase, occupancyLevel: OccupancyLevel, tick: number): Promise<void>
  get(worldId: WorldId, locationId: LocationId): Promise<PlaceRhythmProfile | null>
}
