import type { CausalReference } from "@avatark/world-memory-contracts"
import type { WorldId } from "@avatark/runtime-contracts"

// Sprint 18, Phase 0 §6: eligibility is a gate on ENTRY, never a
// judgment on TRUTH. The runtime never asks "should this become
// Canon?" -- only "is Canon's already-authored event eligible to
// project here, now?" `reasons` reuses the SAME structured-provenance
// atom (`CausalReference`) used everywhere else in this codebase,
// never a prose explanation.
export interface CanonicalEventEligibility {
  canonicalEventId: string
  worldInstanceId: WorldId
  eligible: boolean
  reasons: CausalReference[]
}
