import type { EncounterOpportunity } from "@avatark/living-population-contracts"
import type { WorldId } from "@avatark/runtime-contracts"
import type { EncounterHistoryEntry } from "@avatark/world-memory-contracts"
import { deriveMemoryRecordId } from "./eventIdentity.ts"

function key(ruleId: string, locationId: string): string {
  return `${ruleId}:${locationId}`
}

// Sprint 11, Phase 10: the historical LIFECYCLE, tracked by diffing two
// ticks' own EncounterOpportunity sets -- current-tick availability
// itself is still entirely Sprint 7/10's own computation, unmodified.
export function trackEncounterHistory(worldId: WorldId, previousOpportunities: EncounterOpportunity[], currentOpportunities: EncounterOpportunity[], tick: number): EncounterHistoryEntry[] {
  const previousKeys = new Set(previousOpportunities.map((o) => key(o.ruleId, o.locationId)))
  const currentKeys = new Set(currentOpportunities.map((o) => key(o.ruleId, o.locationId)))
  const entries: EncounterHistoryEntry[] = []

  currentOpportunities.forEach((o, index) => {
    if (previousKeys.has(key(o.ruleId, o.locationId))) return
    entries.push({
      id: deriveMemoryRecordId(worldId, tick, `encounterHistory:AVAILABLE:${o.ruleId}`, [], [o.locationId], index),
      worldId,
      ruleId: o.ruleId,
      locationId: o.locationId,
      category: o.category,
      status: "AVAILABLE",
      tick,
      contributingEntityIds: o.contributingEntityIds,
    })
  })

  previousOpportunities.forEach((o, index) => {
    if (currentKeys.has(key(o.ruleId, o.locationId))) return
    entries.push({
      id: deriveMemoryRecordId(worldId, tick, `encounterHistory:NO_LONGER_AVAILABLE:${o.ruleId}`, [], [o.locationId], index),
      worldId,
      ruleId: o.ruleId,
      locationId: o.locationId,
      category: o.category,
      status: "NO_LONGER_AVAILABLE",
      tick,
      contributingEntityIds: o.contributingEntityIds,
    })
  })

  return entries
}

// Sprint 11, Phase 10: RESOLVED is recorded only when a visitor's
// select-encounter intent was acknowledged available -- reusing Sprint
// 8's own existing, non-mutating availability check
// (dispatchInteractionIntent's "select-encounter" branch), never a new
// consequence/reward system.
export function recordEncounterResolved(worldId: WorldId, opportunity: EncounterOpportunity, tick: number): EncounterHistoryEntry {
  return {
    id: deriveMemoryRecordId(worldId, tick, `encounterHistory:RESOLVED:${opportunity.ruleId}`, [], [opportunity.locationId], 0),
    worldId,
    ruleId: opportunity.ruleId,
    locationId: opportunity.locationId,
    category: opportunity.category,
    status: "RESOLVED",
    tick,
    contributingEntityIds: opportunity.contributingEntityIds,
  }
}
