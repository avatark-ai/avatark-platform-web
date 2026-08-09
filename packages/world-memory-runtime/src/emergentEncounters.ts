import type { EncounterCategory, EncounterRuleId, EntityId } from "@avatark/living-systems-contracts"
import type { EncounterOpportunity } from "@avatark/living-population-contracts"
import type { LocationId } from "@avatark/runtime-contracts"
import type { WorldEvent, WorldEventCategory } from "@avatark/world-memory-contracts"

// Sprint 11, Phase 9: emergence is CONDITIONAL, never narrative --
// "if a WorldEvent of this category occurred at this location within N
// ticks, AND something is currently present there, surface this
// opportunity." No prose, no invented content; the rule names an
// existing, generic EncounterCategory (Sprint 7's own vocabulary), and
// the opportunity's own identity is a plain, reviewable rule id.
export interface EmergentEncounterRule {
  ruleId: EncounterRuleId
  category: EncounterCategory
  requiresLocationId: LocationId
  requiresEventCategory: WorldEventCategory
  withinLastTicks: number
}

export interface ResolveEmergentEncounterOpportunitiesParams {
  baseOpportunities: EncounterOpportunity[]
  worldEvents: WorldEvent[]
  presenceByLocation: Record<LocationId, EntityId[]>
  rules: EmergentEncounterRule[]
  currentTick: number
}

// Sprint 7's own resolveAvailableEncounters and Sprint 10's own
// computeEncounterOpportunities are UNMODIFIED and remain the base
// computation -- this is a second pass layered on top, additive, never
// a change to either.
export function resolveEmergentEncounterOpportunities(params: ResolveEmergentEncounterOpportunitiesParams): EncounterOpportunity[] {
  const alreadyPresent = new Set(params.baseOpportunities.map((o) => `${o.ruleId}:${o.locationId}`))
  const emergent: EncounterOpportunity[] = []

  for (const rule of params.rules) {
    const key = `${rule.ruleId}:${rule.requiresLocationId}`
    if (alreadyPresent.has(key)) continue

    const present = params.presenceByLocation[rule.requiresLocationId] ?? []
    if (present.length === 0) continue

    const qualifyingEvent = params.worldEvents.find((event) => event.category === rule.requiresEventCategory && event.locationId === rule.requiresLocationId && params.currentTick - event.tick <= rule.withinLastTicks && params.currentTick >= event.tick)
    if (!qualifyingEvent) continue

    emergent.push({ ruleId: rule.ruleId, locationId: rule.requiresLocationId, category: rule.category, contributingEntityIds: present, tick: params.currentTick })
  }

  return [...params.baseOpportunities, ...emergent]
}
