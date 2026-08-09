import type { WorldId } from "@avatark/runtime-contracts"
import type { EntityMemoryEntry, EntityMemoryEntryType, WorldEvent } from "@avatark/world-memory-contracts"
import { deriveMemoryRecordId } from "./eventIdentity.ts"

// Sprint 11, Phase 6/8: entity memory is derived FROM already-filtered
// WorldEvents -- never a second significance decision, never a second
// simulation pass. Two sources per event: its own explicit,
// entity-targeted consequences (RESOURCE_PREFERENCE/GROUP_HISTORY_
// RELATIONSHIP), and a small set of participant-driven mappings for
// event categories that inherently concern the entities involved
// (relocation, stress, encounter involvement).
const CONSEQUENCE_TO_ENTRY_TYPE: Partial<Record<string, EntityMemoryEntryType>> = {
  RESOURCE_PREFERENCE: "PREVIOUS_RESOURCE_LOCATION",
  GROUP_HISTORY_RELATIONSHIP: "RECENT_GROUP_MEMBERSHIP",
}

export function deriveEntityMemoryEntries(worldId: WorldId, events: WorldEvent[]): EntityMemoryEntry[] {
  const entries: EntityMemoryEntry[] = []

  for (const event of events) {
    event.consequences.forEach((consequence, index) => {
      const type = CONSEQUENCE_TO_ENTRY_TYPE[consequence.type]
      if (!type || !consequence.targetEntityId) return
      const detail: Record<string, string | number | boolean> = type === "PREVIOUS_RESOURCE_LOCATION" ? { locationId: consequence.targetLocationId ?? "" } : { groupId: consequence.targetGroupId ?? "" }
      entries.push({
        id: deriveMemoryRecordId(worldId, event.tick, `${event.id}:consequence`, event.causalReferences, [consequence.targetEntityId], index),
        worldId,
        entityId: consequence.targetEntityId,
        type,
        tick: event.tick,
        detail,
        significance: event.significance,
        provenance: { derivedFromEventIds: [event.id], derivationRule: "consequence", causalReferences: event.causalReferences },
      })
    })

    const participantEntryType: EntityMemoryEntryType | null =
      event.category === "POPULATION_MOVEMENT"
        ? "RECENT_RELOCATION"
        : event.category === "LOCATION_CONDITION_CHANGED" || event.category === "RESOURCE_CONDITION_CHANGED"
          ? "RECENT_STRESS_CONDITION"
          : event.category === "ENCOUNTER_BECAME_AVAILABLE"
            ? "RECENT_ENCOUNTER_INVOLVEMENT"
            : event.category === "SEPARATION_OCCURRED"
              ? "RECENT_SEPARATION"
              : event.category === "REUNION_OCCURRED"
                ? "RECENT_REUNION"
                : null

    if (participantEntryType) {
      event.participantEntityIds.forEach((entityId, index) => {
        entries.push({
          id: deriveMemoryRecordId(worldId, event.tick, `${event.id}:participant`, event.causalReferences, [entityId], index),
          worldId,
          entityId,
          type: participantEntryType,
          tick: event.tick,
          detail: { locationId: event.locationId ?? "" },
          significance: event.significance,
          provenance: { derivedFromEventIds: [event.id], derivationRule: "participant", causalReferences: event.causalReferences },
        })
      })
    }
  }

  return entries
}
