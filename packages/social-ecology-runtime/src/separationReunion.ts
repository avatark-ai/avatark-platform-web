import { createHash } from "node:crypto"
import type { ReunionEvent, SeparationState, SeparationSubjectType } from "@avatark/social-ecology-contracts"
import type { EntityId } from "@avatark/living-systems-contracts"
import type { WorldId } from "@avatark/runtime-contracts"

// Content-derived, deterministic -- same discipline as Sprint 9/11's
// own eventIdentity.ts helpers; replaying the identical interval
// regenerates the identical id, letting an upsert-by-id save converge
// rather than duplicate (Phase 19).
function deriveSeparationId(worldId: WorldId, subjectType: SeparationSubjectType, subjectId: string, entityId: EntityId, separatedSinceTick: number): string {
  return createHash("sha256").update([worldId, subjectType, subjectId, entityId, String(separatedSinceTick)].join("|")).digest("hex")
}

function deriveReunionId(worldId: WorldId, subjectType: SeparationSubjectType, subjectId: string, entityId: EntityId, tick: number): string {
  return createHash("sha256").update([worldId, subjectType, subjectId, entityId, String(tick), "reunion"].join("|")).digest("hex")
}

export interface EvaluateSeparationTransitionParams {
  worldId: WorldId
  subjectType: SeparationSubjectType
  subjectId: string
  entityId: EntityId
  currentlySeparated: boolean
  existingActiveSeparation: SeparationState | null
  tick: number
}

export interface SeparationTransitionResult {
  separationState: SeparationState | null
  reunionEvent: ReunionEvent | null
}

// Sprint 12, Phase 10/11: separation/reunion modeled as a STATE
// TRANSITION, never emotion. `currentlySeparated` is computed by the
// caller from authoritative location comparison
// (entity vs. related entity, or entity vs. its own group) -- this
// function only decides what the transition itself implies:
//   not separated -> separated       : a NEW SeparationState begins
//   separated -> separated           : no change (still ongoing)
//   separated -> not separated       : a ReunionEvent fires, the
//                                       SeparationState resolves
//   not separated -> not separated   : nothing to do
export function evaluateSeparationTransition(params: EvaluateSeparationTransitionParams): SeparationTransitionResult {
  const { worldId, subjectType, subjectId, entityId, currentlySeparated, existingActiveSeparation, tick } = params

  if (currentlySeparated) {
    if (existingActiveSeparation) return { separationState: existingActiveSeparation, reunionEvent: null }
    return {
      separationState: { id: deriveSeparationId(worldId, subjectType, subjectId, entityId, tick), worldId, subjectType, subjectId, entityId, separatedSinceTick: tick, active: true, resolvedAtTick: null },
      reunionEvent: null,
    }
  }

  if (!existingActiveSeparation) return { separationState: null, reunionEvent: null }

  const separationDurationTicks = tick - existingActiveSeparation.separatedSinceTick
  return {
    separationState: { ...existingActiveSeparation, active: false, resolvedAtTick: tick },
    reunionEvent: { id: deriveReunionId(worldId, subjectType, subjectId, entityId, tick), worldId, subjectType, subjectId, entityId, tick, separationDurationTicks },
  }
}
