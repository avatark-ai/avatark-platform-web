import { isWellFormedInteractionIntent } from "@avatark/world-embodiment-contracts"
import type { InteractionIntent } from "@avatark/world-embodiment-contracts"
import type { WorldDefinition } from "@avatark/living-world-runtime"

export interface InteractionIntentValidationResult {
  valid: boolean
  errors: string[]
}

// Sprint 8, Phase 9: STRUCTURAL + existence validation only -- "is this
// intent well-formed, and does it reference a real world/location."
// Deeper LEGALITY (is this transition legal from the visitor's *current*
// location right now) is deliberately NOT duplicated here: that state
// machine already lives in @avatark/living-world-runtime (Sprint 5),
// which throws InvalidWorldTransitionError for an illegal move. The Host
// dispatcher (lib/worldEmbodiment/orchestrator.ts) calls this validator
// first to reject garbage cheaply, then still goes through the real
// runtime for the actual transition -- illegal navigation is rejected by
// the SAME authority it always was, never a second, competing rule set.
export function validateInteractionIntent(intent: unknown, definition: WorldDefinition): InteractionIntentValidationResult {
  if (!isWellFormedInteractionIntent(intent)) {
    return { valid: false, errors: ["intent is not well-formed"] }
  }

  const errors: string[] = []
  if (intent.worldId !== definition.id) {
    errors.push(`intent worldId "${intent.worldId}" does not match world "${definition.id}"`)
  }

  const locationId = "locationId" in intent ? intent.locationId : undefined
  if (locationId !== undefined && !definition.locations.some((location) => location.id === locationId)) {
    errors.push(`locationId "${locationId}" does not exist in world "${definition.id}"`)
  }

  return { valid: errors.length === 0, errors }
}

export type { InteractionIntent }
