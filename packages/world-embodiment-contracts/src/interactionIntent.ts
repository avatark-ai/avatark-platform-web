import type { EncounterRuleId } from "@avatark/living-systems-contracts"
import type { LocationId, UserId, WorldId } from "@avatark/runtime-contracts"

// Sprint 8, Phase 9: the renderer -> Host interaction boundary. An
// InteractionIntent expresses what the visitor requested -- it never
// mutates world state itself (there is no `apply()`/`execute()` method
// on this type, and no field a renderer could set that changes
// season/weather/entity/encounter truth directly). Every variant maps to
// an EXISTING lib/runtimeKernel/orchestrator.ts operation (Sprint 5) --
// this sprint reuses those operations, it does not add a new mutation
// path alongside them. `select-encounter` is the one deliberate
// exception: Sprint 7 modeled encounters as affordances/opportunities,
// not events with a persisted "selected" consequence -- so this intent
// validates (is the encounter currently available?) but intentionally
// causes no state change, an honest reflection of what Sprint 7 actually
// built, not a gap this sprint silently papers over.
export interface EnterWorldIntent {
  type: "enter-world"
  userId: UserId
  worldId: WorldId
}

export interface LeaveWorldIntent {
  type: "leave-world"
  userId: UserId
  worldId: WorldId
}

export interface VisitLocationIntent {
  type: "visit-location"
  userId: UserId
  worldId: WorldId
  locationId: LocationId
}

export interface BeginReflectionIntent {
  type: "begin-reflection"
  userId: UserId
  worldId: WorldId
  locationId: LocationId
  reflectionId: string
}

export interface SelectEncounterIntent {
  type: "select-encounter"
  userId: UserId
  worldId: WorldId
  locationId: LocationId
  ruleId: EncounterRuleId
}

export type InteractionIntent = EnterWorldIntent | LeaveWorldIntent | VisitLocationIntent | BeginReflectionIntent | SelectEncounterIntent

const INTENT_TYPES = new Set<InteractionIntent["type"]>(["enter-world", "leave-world", "visit-location", "begin-reflection", "select-encounter"])

// Structural well-formedness only (right shape, right field types) --
// mirrors @avatark/renderer-contracts' validateExperienceDescription's
// own separation of concerns. Whether an intent is currently LEGAL
// (e.g. does this transition exist in the world's own graph) requires
// live WorldSnapshot state and lives in @avatark/world-embodiment-runtime
// instead, the same split Sprint 7 already applied to season-transition
// legality.
export function isWellFormedInteractionIntent(value: unknown): value is InteractionIntent {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  if (typeof candidate.type !== "string" || !INTENT_TYPES.has(candidate.type as InteractionIntent["type"])) return false
  if (typeof candidate.userId !== "string" || candidate.userId.length === 0) return false
  if (typeof candidate.worldId !== "string" || candidate.worldId.length === 0) return false
  if (candidate.type === "visit-location" || candidate.type === "begin-reflection" || candidate.type === "select-encounter") {
    if (typeof candidate.locationId !== "string" || candidate.locationId.length === 0) return false
  }
  if (candidate.type === "begin-reflection" && (typeof candidate.reflectionId !== "string" || candidate.reflectionId.length === 0)) return false
  if (candidate.type === "select-encounter" && (typeof candidate.ruleId !== "string" || candidate.ruleId.length === 0)) return false
  return true
}
