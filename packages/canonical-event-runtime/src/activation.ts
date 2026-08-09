import type { CanonicalEventDefinition, CanonicalEventEligibility, WorldInstanceCanonicalProjectionState } from "@avatark/canonical-event-contracts"
import { deriveCanonicalActivationId } from "./activationIdentity.ts"

export interface ResolveCanonicalEventActivationParams {
  worldInstanceId: string
  definition: CanonicalEventDefinition
  eligibility: CanonicalEventEligibility
  /** The state as of the PREVIOUS call for this (worldInstanceId,
   * canonicalEventId) pair, or null if never evaluated before. */
  currentState: WorldInstanceCanonicalProjectionState | null
  tick: number
}

// Sprint 18, Phase 0 §8: the ONE place an ELIGIBLE canonical event
// becomes ACTIVATED, or does not. Pure, deterministic, idempotent by
// construction -- a call whose `currentState` already carries a
// non-null `activationId` returns that SAME state UNCHANGED, never
// recomputing a new id or re-transitioning (`ACTIVATED`/`PROJECTING`/
// `COMPLETED` are all "already progressed, leave alone" from this
// function's own point of view; the Host layer alone advances
// `PROJECTING -> COMPLETED` once consequence work actually succeeds --
// see lib/canonicalEvents/hostService.ts). This mirrors
// @avatark/encounter-realization-runtime's own `resolveEncounterRealization`
// posture exactly: the renderer/visitor never call this, only the Host
// wake chain does.
export function resolveCanonicalEventActivation(params: ResolveCanonicalEventActivationParams): WorldInstanceCanonicalProjectionState {
  const base: WorldInstanceCanonicalProjectionState = params.currentState ?? {
    worldInstanceId: params.worldInstanceId,
    canonicalEventId: params.definition.identity.canonicalEventId,
    status: "DORMANT",
    activationId: null,
    mandatedFacts: params.definition.mandatedFacts,
    scope: params.definition.scope,
    provenance: params.definition.provenance,
    activatedAtTick: null,
    completedAtTick: null,
    worldEventId: null,
  }

  if (base.activationId !== null) return base // already activated (or beyond) -- idempotent no-op

  if (!params.eligibility.eligible) return { ...base, status: "DORMANT" }

  const activationId = deriveCanonicalActivationId(params.worldInstanceId, params.definition.identity.canonicalEventId, params.definition.identity.definitionContentHash, params.tick)
  return { ...base, status: "ACTIVATED", activationId, activatedAtTick: params.tick }
}
