import type { EntityId } from "@avatark/living-systems-contracts"
import type { WorldId } from "@avatark/runtime-contracts"
import type { EntityMemoryEntryId, MemorySignificance } from "./ids.ts"
import type { MemoryProvenance } from "./provenance.ts"

// Sprint 11, Phase 6: ecological/behavioral continuity, never
// autobiographical cognition -- a closed, small vocabulary of what one
// entity can meaningfully carry forward. No emotion, no personality, no
// belief, no LLM-generated content.
export type EntityMemoryEntryType = "PREVIOUS_RESOURCE_LOCATION" | "RECENT_GROUP_MEMBERSHIP" | "RECENT_STRESS_CONDITION" | "RECENT_RELOCATION" | "RECENT_ENCOUNTER_INVOLVEMENT"

export interface EntityMemoryEntry {
  id: EntityMemoryEntryId
  worldId: WorldId
  entityId: EntityId
  type: EntityMemoryEntryType
  tick: number
  detail: Record<string, string | number | boolean>
  significance: MemorySignificance
  provenance: MemoryProvenance
}

export type AppendEntityMemoryResult = { status: "appended" } | { status: "duplicate_ignored" }

export interface EntityMemoryRepository {
  // Idempotent by id (Phase 18), and bounded per (entityId, type) --
  // implementations keep only the most recent K entries per type
  // (Phase 6's own "minimal meaningful memory," not an unbounded log).
  append(entry: EntityMemoryEntry): Promise<AppendEntityMemoryResult>
  list(worldId: WorldId, entityId: EntityId): Promise<EntityMemoryEntry[]>
  listByType(worldId: WorldId, entityId: EntityId, type: EntityMemoryEntryType): Promise<EntityMemoryEntry[]>
}
