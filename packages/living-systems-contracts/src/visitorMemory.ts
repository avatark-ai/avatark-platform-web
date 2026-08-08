import type { LocationId, MilestoneRef, Reference, ReflectionRef, UserId, WorldId } from "@avatark/runtime-contracts"

// Sprint 7, Phase 9: visitor-specific meaningful memory, separate from
// shared world simulation. Answers "what does this visitor need
// remembered so return feels continuous," never "what can we infer
// about this person's psychology" -- no score, no engagement metric, no
// inferred emotional/spiritual/psychological field exists on this type,
// per STK-CAN-004's Privacy Principle.
export type MeaningfulEncounterRef = Reference<"encounter">

export interface VisitorWorldMemory {
  userId: UserId
  worldId: WorldId
  lastLocationId: LocationId | null
  /** Encounters this visitor actually experienced, in order of
   * occurrence -- an opaque pointer per entry, never behavioral content
   * about *why* it was meaningful. */
  meaningfulEncounters: MeaningfulEncounterRef[]
  reflectionRefs: ReflectionRef[]
  milestoneRefs: MilestoneRef[]
  updatedAtTick: number
}

export function emptyVisitorWorldMemory(userId: UserId, worldId: WorldId): VisitorWorldMemory {
  return { userId, worldId, lastLocationId: null, meaningfulEncounters: [], reflectionRefs: [], milestoneRefs: [], updatedAtTick: 0 }
}
