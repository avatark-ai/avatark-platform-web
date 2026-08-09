import type { MemoryRetentionPolicy, MemorySignificance, RetentionTier, WorldEvent } from "@avatark/world-memory-contracts"

export const DEFAULT_RETENTION_POLICY: MemoryRetentionPolicy = { recentWindowTicks: 20, durableWindowTicks: 100 }

// Sprint 11, Phase 19: the retention/compaction CONTRACT's one concrete
// reference behavior -- not production archival infrastructure. A
// LANDMARK-significant event is always LANDMARK-tiered and never ages;
// everything else starts RECENT and ages forward over ticks.
export function initialRetentionTier(significance: MemorySignificance): RetentionTier {
  return significance === "LANDMARK" ? "LANDMARK" : "RECENT"
}

export function ageRetentionTier(event: WorldEvent, nowTick: number, policy: MemoryRetentionPolicy = DEFAULT_RETENTION_POLICY): RetentionTier {
  if (event.retentionTier === "LANDMARK") return "LANDMARK"
  const age = nowTick - event.tick
  if (age >= policy.durableWindowTicks) return "COMPACTABLE"
  if (age >= policy.recentWindowTicks) return "DURABLE"
  return "RECENT"
}

export interface CompactionResult {
  kept: WorldEvent[]
  compactedIds: string[]
}

// A reference compaction pass, not a real archival pipeline: events
// already aged to COMPACTABLE are dropped from the "kept" set (a real
// implementation would summarize-and-archive them; this sprint only
// proves the CONTRACT that decides which ones are eligible). LANDMARK
// events are never candidates, by construction -- their tier can never
// become COMPACTABLE (ageRetentionTier's own short-circuit above).
export function compactWorldEvents(events: WorldEvent[], nowTick: number, policy: MemoryRetentionPolicy = DEFAULT_RETENTION_POLICY): CompactionResult {
  const kept: WorldEvent[] = []
  const compactedIds: string[] = []
  for (const event of events) {
    const tier = ageRetentionTier(event, nowTick, policy)
    if (tier === "COMPACTABLE") compactedIds.push(event.id)
    else kept.push(tier === event.retentionTier ? event : { ...event, retentionTier: tier })
  }
  return { kept, compactedIds }
}
