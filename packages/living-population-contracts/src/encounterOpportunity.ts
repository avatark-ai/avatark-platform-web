import type { EncounterCategory, EncounterRuleId, EntityId } from "@avatark/living-systems-contracts"
import type { LocationId } from "@avatark/runtime-contracts"

// Sprint 10, Phase 14: population presence contributing to an ALREADY
// Sprint-7-resolved AvailableEncounter -- never a new encounter type,
// never a mutator of canon. `contributingEntityIds` is the entity/group
// whose presence at `locationId` made this opportunity meaningful; the
// eligibility condition itself is still entirely owned by Sprint 7's
// own `resolveAvailableEncounters` (unmodified) and, for
// narrative-protected rules, the read-only protected-narrative gate.
export interface EncounterOpportunity {
  ruleId: EncounterRuleId
  locationId: LocationId
  category: EncounterCategory
  contributingEntityIds: EntityId[]
  tick: number
}
