import type { SignificanceConfig } from "@avatark/world-memory-runtime"
import type { EmergentEncounterRule } from "@avatark/world-memory-runtime"

// Sprint 11: world-specific memory configuration -- a Host-layer,
// non-canonical, systems-config judgment call, the same category of
// decision Sprint 10's own vrindavanPopulationDefinition.ts already
// made for population archetypes. `evaluateSignificance`/
// `resolveEmergentEncounterOpportunities` are otherwise fully generic;
// this file supplies the one world's own thresholds/rules, never a
// hardcoded branch inside the engine.
export const VRINDAVAN_SIGNIFICANCE_CONFIG: SignificanceConfig = { scarcityBands: ["low"] }

// A purely systemic emergent rule: if the cow herd relocated TO
// kadamba-grove within the last 10 ticks and is still present there,
// surface an extra ambient encounter opportunity there -- conditional
// on world history, never scripted content. No name, no dialogue, no
// story; `ruleId` and `category` reuse the exact same
// EncounterRule/EncounterCategory vocabulary Sprint 7 already defined.
// Sprint 12, Phase 21: the exact same generic, conditional emergent
// mechanism -- a rule keyed on the new REUNION_OCCURRED category
// (social-ecology-runtime's own detection, fed into World Memory via
// lib/socialEcology/hostService.ts) rather than a new encounter
// engine. No narrative content: a reunion at Kadamba Grove surfaces an
// ambient opportunity, nothing more.
export const VRINDAVAN_EMERGENT_ENCOUNTER_RULES: EmergentEncounterRule[] = [
  {
    ruleId: "avatark-population-recent-arrival-kadamba-grove",
    category: "ambient",
    requiresLocationId: "kadamba-grove",
    requiresEventCategory: "POPULATION_MOVEMENT",
    withinLastTicks: 10,
  },
  {
    ruleId: "avatark-social-recent-reunion-kadamba-grove",
    category: "ambient",
    requiresLocationId: "kadamba-grove",
    requiresEventCategory: "REUNION_OCCURRED",
    withinLastTicks: 10,
  },
]
