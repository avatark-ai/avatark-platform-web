// Sprint 10: identifiers for the population/behavior domain. Plain
// string aliases -- matching the unbranded convention every existing
// runtime package already uses (see @avatark/runtime-contracts's own
// ids.ts, which explicitly rejected branding to avoid touching every
// existing signature).
export type GroupId = string
export type RhythmScheduleId = string
export type BehaviorProfileId = string

// A generic, renderer-neutral tag describing what a LOCATION affords a
// living entity -- not a StudioK narrative concept, a Host-layer
// systems tag derived from already-Approved location descriptions (see
// docs/SPRINT10_GROUND_TRUTH.md's "roster-split decision"). Kept as a
// closed union so a Host-layer mapping can't silently invent new,
// unreviewed resource kinds.
export type ResourceTag = "water" | "vegetation" | "shelter" | "gathering"
