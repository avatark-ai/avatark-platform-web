import type { Timestamp } from "@avatark/runtime-contracts"
import type { WorldDefinitionId, WorldInstanceId, WorldVersion } from "./ids.ts"

// Sprint 9, Phase 2: WORLD DEFINITION vs WORLD INSTANCE.
//
//   Living Vrindavan definition
//           |
//   persistent Vrindavan world instance
//           |
//   shared evolving state
//
// WorldDefinition is intentionally minimal here -- it is NOT a
// replacement for @avatark/living-world-runtime's own WorldDefinition
// (locations, transitions) or Living Systems' SeasonDefinition/
// EntityArchetype/EncounterRule set. Those already model "what kind of
// world this is" in full. This type exists only to give a
// WorldInstance something to reference by id + version, so the runtime
// can express "this instance was derived from that definition at that
// version" without deciding any product policy about how many instances
// of one definition should exist.
export interface WorldDefinition {
  readonly id: WorldDefinitionId
  readonly version: WorldVersion
  readonly name: string
}

// A particular persistent, running world derived from a WorldDefinition.
// Deliberately carries no policy about WHY it exists (global/regional/
// cohort/private) -- see this package's own README section in index.ts
// header comment. That decision is product policy, made above this
// layer; the runtime only needs to be able to represent "many instances,
// one definition" and "one instance, one line of authoritative history."
export interface WorldInstance {
  readonly id: WorldInstanceId
  readonly definitionId: WorldDefinitionId
  readonly definitionVersion: WorldVersion
  readonly createdAt: Timestamp
}

export interface WorldInstanceRepository {
  get(id: WorldInstanceId): Promise<WorldInstance | null>
  // Idempotent by id: creating the same id twice with the same
  // definition/version is a no-op, not an error (Phase 9).
  create(instance: WorldInstance): Promise<WorldInstance>
  listByDefinition(definitionId: WorldDefinitionId): Promise<WorldInstance[]>
}
