import type { WorldId } from "@avatark/runtime-contracts"

// Sprint 18, Phase 0 §20: two facts, never one. `WorldInstanceCanonicalProjectionState`
// (projectionState.ts) is Fact A -- world-scoped, actor-independent. This
// is Fact B -- visitor-scoped, per-actor. `@avatark/experience-registry`'s
// existing `ExperienceEvent` is structurally single-actor/self-reported
// with no world-fact-linkable target, so this is a NEW shape, not a
// repurposed `ExperienceEvent` (Phase 0's own explicit finding, §1/§27).
// A world may complete a canonical projection while zero visitors are
// present (Fact A exists, no Fact B records exist yet); a visitor
// arriving afterward experiences the CONSEQUENCES via WorldSnapshot/
// world memory without ever producing this record -- witnessing and
// consequence-exposure are not the same thing.
export interface VisitorCanonicalEventWitness {
  userId: string
  canonicalEventId: string
  worldInstanceId: WorldId
  /** Links back to Fact A's own `activationId` -- never duplicates its
   * content. */
  activationId: string
  witnessedAtTick: number
}

export type AppendCanonicalEventWitnessResult = { status: "appended" } | { status: "duplicate_ignored" }

export interface VisitorCanonicalEventWitnessRepository {
  // Idempotent by (worldInstanceId, userId, canonicalEventId) -- a
  // visitor witnessing the same completed event twice (e.g. leaving and
  // returning) never produces a second record.
  append(witness: VisitorCanonicalEventWitness): Promise<AppendCanonicalEventWitnessResult>
  listByUser(worldId: WorldId, userId: string): Promise<VisitorCanonicalEventWitness[]>
}
