// Sprint 11, Phase 19: a retention/compaction CONTRACT, not production
// archival infrastructure. A stored WorldEvent occupies exactly one
// tier at a time; tiers age forward (RECENT -> DURABLE -> COMPACTABLE)
// except LANDMARK, which never ages and is never compacted. Protected
// Canon has no tier at all -- it is never subject to this contract,
// because it is never stored as a WorldEvent in the first place
// (Phase 14).
export type RetentionTier = "RECENT" | "DURABLE" | "LANDMARK" | "COMPACTABLE"

export interface MemoryRetentionPolicy {
  /** Ticks after which a MEANINGFUL (non-landmark) event ages from
   * RECENT to DURABLE. */
  recentWindowTicks: number
  /** Ticks after which a DURABLE event becomes COMPACTABLE. */
  durableWindowTicks: number
}
