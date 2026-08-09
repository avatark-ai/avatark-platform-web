// Sprint 11: identifiers for the World Memory / Entity Memory domains.
// Plain string aliases -- matching the unbranded convention every
// existing runtime package already uses.
export type WorldEventId = string
export type EntityMemoryEntryId = string
export type HistoricalMarkerId = string
export type EncounterHistoryEntryId = string

// Sprint 11, Phase 3: the OUTCOME of the deterministic significance
// filter -- decides whether a candidate event is recorded at all, and
// how prominently. Distinct from RetentionTier (retention.ts), which is
// a later-life COMPACTION stage a stored event moves through over time.
// A LANDMARK-significant event always starts at LANDMARK retention and
// is never compacted; NOT_SIGNIFICANT candidates are never stored.
export type MemorySignificance = "NOT_SIGNIFICANT" | "MEANINGFUL" | "LANDMARK"
