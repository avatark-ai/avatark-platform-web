import type { AdaptationEffect } from "@avatark/world-adaptation-contracts"
import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 15's own PLACE-domain AdaptationEffect.locationId is NOT
// always a plain LocationId: @avatark/world-adaptation-runtime's own
// `deriveAdaptationSignals` keys per-resource-category readings
// (RESOURCE_PRESSURE/RESOURCE_AVAILABILITY_CONSEQUENCE-family kinds) by
// the composite subject `${locationId}:${category}`, while
// encounter-derived kinds (ENCOUNTER_ELIGIBILITY, etc.) carry a plain
// LocationId. `lib/worldAdaptation/hostService.ts`'s own
// `applyAdaptationEffect` already parses this identical composite key
// -- this helper applies the SAME parsing so every Sprint 16 consumer
// of a PLACE effect's location matches consistently, never
// reinterpreting Sprint 15's own convention.
export function resolvePlaceEffectLocationId(effect: Extract<AdaptationEffect, { domain: "PLACE" }>): LocationId {
  const [locationId] = effect.locationId.split(":")
  return locationId
}
