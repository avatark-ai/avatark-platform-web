import type { EntityArchetypeId } from "@avatark/living-systems-contracts"
import type { EntityCapability } from "./capability.ts"
import type { NeedDefinition } from "./needs.ts"
import type { RhythmScheduleId } from "./ids.ts"

export type GroupKind = "herd" | "flock"

// Sprint 10, Phase 2/3/4: world-specific behavioral CONFIGURATION for one
// EntityArchetype -- the data a Host layer supplies to make the generic
// population engine produce world-appropriate behavior, never a
// hardcoded rule inside the engine itself. Keyed by `archetypeId`
// rather than embedding capabilities on `EntityArchetype` directly
// (Sprint 7's own type, left untouched -- see
// docs/SPRINT10_GROUND_TRUTH.md's "roster-split decision").
export interface EntityBehaviorProfile {
  archetypeId: EntityArchetypeId
  capabilities: EntityCapability[]
  needDefinitions: NeedDefinition[]
  rhythmScheduleId: RhythmScheduleId
  groupKind: GroupKind | null
}
