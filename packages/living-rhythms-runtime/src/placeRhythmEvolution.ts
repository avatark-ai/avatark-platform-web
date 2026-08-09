import type { DayPhase, OccupancyLevel, PlaceRhythmCount, PlaceRhythmProfile, PlaceRhythmRepository } from "@avatark/living-rhythms-contracts"
import type { LocationId, WorldId } from "@avatark/runtime-contracts"

// Deterministic tie-break for "which occupancy level is TYPICAL at this
// day phase" -- used only when two counts are exactly equal, so replay
// stays deterministic rather than depending on array/Map iteration
// order.
const OCCUPANCY_LEVEL_PRIORITY: OccupancyLevel[] = ["QUIET", "RESTING", "ACTIVE", "GATHERING", "DISPERSING"]

// Sprint 13, Phase 10: "this place feels different in the morning,"
// derived, never scripted -- the occupancy level with the highest
// observation count for a given day phase, deterministically
// tie-broken. Returns null if this day phase has never been observed
// at this location.
export function typicalOccupancyLevel(profile: PlaceRhythmProfile, dayPhase: DayPhase): OccupancyLevel | null {
  const forPhase = profile.counts.filter((c) => c.dayPhase === dayPhase)
  if (forPhase.length === 0) return null
  return [...forPhase].sort((a, b) => b.observationCount - a.observationCount || OCCUPANCY_LEVEL_PRIORITY.indexOf(a.occupancyLevel) - OCCUPANCY_LEVEL_PRIORITY.indexOf(b.occupancyLevel))[0].occupancyLevel
}

function incrementCount(counts: PlaceRhythmCount[], dayPhase: DayPhase, occupancyLevel: OccupancyLevel): PlaceRhythmCount[] {
  const index = counts.findIndex((c) => c.dayPhase === dayPhase && c.occupancyLevel === occupancyLevel)
  if (index === -1) return [...counts, { dayPhase, occupancyLevel, observationCount: 1 }]
  const next = [...counts]
  next[index] = { ...next[index], observationCount: next[index].observationCount + 1 }
  return next
}

// Sprint 13, Phase 10: a BOUNDED aggregate -- at most 7 day phases x 5
// occupancy levels = 35 counters per location, incrementally updated,
// never an event log (see docs/SPRINT13_GROUND_TRUTH.md's decision 4).
export class InMemoryPlaceRhythmRepository implements PlaceRhythmRepository {
  private readonly byWorld = new Map<WorldId, Map<LocationId, PlaceRhythmProfile>>()

  async recordObservation(worldId: WorldId, locationId: LocationId, dayPhase: DayPhase, occupancyLevel: OccupancyLevel, tick: number): Promise<void> {
    if (!this.byWorld.has(worldId)) this.byWorld.set(worldId, new Map())
    const forWorld = this.byWorld.get(worldId)!
    const existing = forWorld.get(locationId) ?? { worldId, locationId, counts: [], lastUpdatedTick: tick }
    forWorld.set(locationId, { worldId, locationId, counts: incrementCount(existing.counts, dayPhase, occupancyLevel), lastUpdatedTick: tick })
  }

  async get(worldId: WorldId, locationId: LocationId): Promise<PlaceRhythmProfile | null> {
    return this.byWorld.get(worldId)?.get(locationId) ?? null
  }
}
