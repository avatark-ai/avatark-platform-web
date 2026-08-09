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
export const VRINDAVAN_EMERGENT_ENCOUNTER_RULES: EmergentEncounterRule[] = [
  {
    ruleId: "avatark-population-recent-arrival-kadamba-grove",
    category: "ambient",
    requiresLocationId: "kadamba-grove",
    requiresEventCategory: "POPULATION_MOVEMENT",
    withinLastTicks: 10,
  },
]
