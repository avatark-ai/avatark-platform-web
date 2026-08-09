import type { ParticipationAuthorization } from "@avatark/participation-contracts"

export interface ResolveParticipationAuthorizationParams {
  // Re-resolved THIS call, against live world state (@avatark/world-persistence-runtime's
  // own getWorldSnapshot) -- never a cached/prior availability result.
  // Phase 0 §18's own explicit requirement: stale intents never trust a
  // snapshot's age.
  availableViaLiveSnapshot: boolean
  // True when the matched AvailableEncounter's own category is NOT
  // "narrative-protected", or the protected-narrative gate has actually
  // resolved open -- the exact same predicate
  // EncounterRecord.protectedNarrativeGateOpen already encodes
  // (lib/encounterRealization/hostService.ts).
  narrativeGateOpen: boolean
}

// Sprint 19: pure, Host-neutral, database-neutral. Never derives or
// applies a world consequence -- it only answers "may this specific
// selection be acknowledged right now," the same narrow question
// Sprint 7/8's own select-encounter branch already asked, before this
// sprint's ParticipationRecord existed at all.
export function resolveParticipationAuthorization(params: ResolveParticipationAuthorizationParams): ParticipationAuthorization {
  if (!params.availableViaLiveSnapshot) return { authorized: false, reason: "ENCOUNTER_NOT_AVAILABLE" }
  if (!params.narrativeGateOpen) return { authorized: false, reason: "NARRATIVE_GATE_CLOSED" }
  return { authorized: true }
}
