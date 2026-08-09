import type { EntityId } from "@avatark/living-systems-contracts"
import type { LocationId, WorldId } from "@avatark/runtime-contracts"
import type { CausalReference, MemoryProvenance } from "./provenance.ts"
import type { WorldEventId } from "./ids.ts"
import type { MemorySignificance } from "./ids.ts"
import type { RetentionTier } from "./retention.ts"

// Sprint 11, Phase 2: not every simulation tick is history -- this is
// the closed vocabulary of what CAN become a World Event, each one a
// meaningful state transition or systemic occurrence, never a raw tick.
//
// Sprint 12, Phase 12: two additive categories for social ecology --
// `SEPARATION_OCCURRED`/`REUNION_OCCURRED` -- state transitions, never
// emotion (see @avatark/social-ecology-contracts' own
// SeparationState/ReunionEvent, which these categories represent in
// World Memory once they cross Sprint 11's own significance filter).
export type WorldEventCategory =
  | "SEASON_TRANSITION"
  | "ENVIRONMENTAL_THRESHOLD"
  | "RESOURCE_CONDITION_CHANGED"
  | "POPULATION_MOVEMENT"
  | "GROUP_FORMED"
  | "GROUP_DISPERSED"
  | "ENTITY_ACTIVITY_TRANSITION"
  | "ENCOUNTER_BECAME_AVAILABLE"
  | "ENCOUNTER_RESOLVED"
  | "LOCATION_CONDITION_CHANGED"
  | "SEPARATION_OCCURRED"
  | "REUNION_OCCURRED"

// Sprint 11, Phase 8: an explicit, data-driven, bounded consequence --
// never an arbitrary callback, never a world-specific conditional
// baked into the core. `targetEntityId`/`targetGroupId`/`targetLocationId`
// name what the consequence is ABOUT; `detail` is flat, inspectable data.
export type WorldConsequenceType = "HISTORICAL_MARKER" | "RESOURCE_PREFERENCE" | "GROUP_HISTORY_RELATIONSHIP" | "LOCATION_HISTORY_MARKER" | "ENCOUNTER_ELIGIBILITY_CHANGE"

export interface WorldConsequence {
  type: WorldConsequenceType
  targetEntityId: EntityId | null
  targetGroupId: string | null
  targetLocationId: LocationId | null
  detail: Record<string, string | number | boolean>
}

// Sprint 11, Phase 1/2: the durable, significance-filtered historical
// record -- explicitly NOT the raw WorldSystemEvent/WorldSystemEventRecord
// stream (Sprint 7/9), which remains untouched and keeps its own
// identity/repository. Every WorldEvent traces back to one or more of
// those records (or a population-tick delta) via `provenance`.
export interface WorldEvent {
  id: WorldEventId
  worldId: WorldId
  tick: number
  category: WorldEventCategory
  locationId: LocationId | null
  participantEntityIds: EntityId[]
  causalReferences: CausalReference[]
  consequences: WorldConsequence[]
  significance: MemorySignificance
  retentionTier: RetentionTier
  provenance: MemoryProvenance
  occurredAt: string
}

export type AppendWorldEventResult = { status: "appended" } | { status: "duplicate_ignored" }

export interface WorldEventRepository {
  // Idempotent: appending a WorldEvent whose id was already stored is a
  // no-op (Phase 18 -- replaying a deterministic catch-up interval must
  // never duplicate memory).
  append(event: WorldEvent): Promise<AppendWorldEventResult>
  listSince(worldId: WorldId, sinceTick: number): Promise<WorldEvent[]>
  listByLocation(worldId: WorldId, locationId: LocationId): Promise<WorldEvent[]>
  listByEntity(worldId: WorldId, entityId: EntityId): Promise<WorldEvent[]>
  listByCategory(worldId: WorldId, category: WorldEventCategory): Promise<WorldEvent[]>
  listRecent(worldId: WorldId, limit: number): Promise<WorldEvent[]>
}
