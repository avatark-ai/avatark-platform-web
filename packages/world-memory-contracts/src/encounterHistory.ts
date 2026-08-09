import type { EncounterCategory, EncounterRuleId, EntityId } from "@avatark/living-systems-contracts"
import type { LocationId, WorldId } from "@avatark/runtime-contracts"
import type { EncounterHistoryEntryId } from "./ids.ts"

// Sprint 11, Phase 10: the historical LIFECYCLE of one encounter rule at
// one location, tracked separately from current-tick availability
// (Sprint 7's own AvailableEncounter / Sprint 10's own
// EncounterOpportunity, both unchanged). No reward/progression system --
// this is a status transition log, nothing else.
export type EncounterHistoryStatus = "AVAILABLE" | "RESOLVED" | "NO_LONGER_AVAILABLE"

export interface EncounterHistoryEntry {
  id: EncounterHistoryEntryId
  worldId: WorldId
  ruleId: EncounterRuleId
  locationId: LocationId
  category: EncounterCategory
  status: EncounterHistoryStatus
  tick: number
  contributingEntityIds: EntityId[]
}

export interface EncounterHistoryRepository {
  append(entry: EncounterHistoryEntry): Promise<{ status: "appended" | "duplicate_ignored" }>
  listByRule(worldId: WorldId, ruleId: EncounterRuleId): Promise<EncounterHistoryEntry[]>
  latestStatus(worldId: WorldId, ruleId: EncounterRuleId): Promise<EncounterHistoryStatus | null>
}
