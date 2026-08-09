import type { AdaptationRule } from "@avatark/world-adaptation-contracts"
import type { ResourceTag } from "@avatark/living-population-contracts"
import { VRINDAVAN_RESOURCE_AFFORDANCES } from "../livingPopulation/vrindavanPopulationDefinition.ts"

// Sprint 15: world-specific adaptation configuration -- a Host-layer,
// non-canonical, systems-config judgment call, the same category of
// decision Sprint 10's own vrindavanPopulationDefinition.ts and Sprint
// 11's own vrindavanMemoryDefinition.ts already made. Every rule here
// is DATA; @avatark/world-adaptation-runtime's own `runWorldAdaptation`
// is otherwise fully generic and never branches on any of these ids
// (see livingForestAdaptationPortability.test.ts for the same engine
// running a wholly different rule set).
//
// Five rules, one per mission-required demonstration category (A-E,
// docs/SPRINT15_FINAL_REPORT.md's own reference-scenario section) --
// deliberately not one per every conceivable domain x kind combination
// (the mission's own "do not add adaptation merely to populate every
// category").
export const VRINDAVAN_ADAPTATION_RULES: AdaptationRule[] = [
  // A. ENTITY ADAPTATION: an entity repeatedly involved in a realized
  // encounter (any rule, any location) develops a bounded resource
  // preference -- applied by lib/worldAdaptation/hostService.ts as a
  // real EntityMemoryEntry, read back by Sprint 11's own unmodified
  // `resolvePreferredResourceLocation` -> memoryHint -> `selectBehavior`
  // bridge (the SAME bridge Sprint 14 §14 already proved).
  {
    id: "avatark-adaptation-entity-repeated-encounter-resource-bias",
    domain: "ENTITY",
    signalKind: "ENCOUNTER_INVOLVEMENT",
    threshold: 3,
    decayPerTick: 0.05,
    reversible: true,
    effect: { domain: "ENTITY", kind: "RESOURCE_PREFERENCE_BIAS", magnitude: 1 },
    description: "An entity repeatedly involved in a realized encounter develops a bounded resource-location preference toward where those encounters occurred.",
  },
  // B. RELATIONSHIP ADAPTATION: a relationship repeatedly evidenced by
  // realized encounters accrues a bounded interaction-likelihood bias
  // -- applied through Social Ecology's own sole write boundary
  // (`applyEncounterEvidence`, lib/socialEcology/hostService.ts),
  // authoritatively raising RelationshipState.band, which
  // @avatark/encounter-realization-runtime's own `resolveEncounterRealization`
  // ALREADY consults for every future opportunity between the same
  // pair -- zero change to that resolver required.
  {
    id: "avatark-adaptation-relationship-repeated-encounter-affinity",
    domain: "RELATIONSHIP",
    signalKind: "ENCOUNTER_EVIDENCE",
    threshold: 2,
    decayPerTick: 0.05,
    reversible: true,
    effect: { domain: "RELATIONSHIP", kind: "INTERACTION_LIKELIHOOD_BIAS", magnitude: 1 },
    description: "A relationship repeatedly evidenced by realized encounters (beyond the raw per-encounter tally) accrues a bounded interaction-likelihood adaptation, reinforcing the SAME relationship band Social Ecology already owns.",
  },
  // C. PLACE ADAPTATION: a place repeatedly hosting a realized
  // encounter becomes habitually significant/encounter-eligible. This
  // sprint computes and persists this effect (queryable, replay-stable)
  // but deliberately does not yet feed it back into
  // resolveEncounterRealization's own inputs -- an honest scope
  // deferral, the same posture Sprint 14 §11 already used for
  // place-rhythm integration.
  {
    id: "avatark-adaptation-place-repeated-encounter-significance",
    domain: "PLACE",
    signalKind: "ENCOUNTER_INVOLVEMENT",
    threshold: 3,
    decayPerTick: 0.05,
    reversible: false,
    effect: { domain: "PLACE", kind: "ENCOUNTER_ELIGIBILITY", magnitude: 1 },
    description: "A place repeatedly hosting a realized encounter becomes habitually encounter-eligible -- a persistent, queryable place condition.",
  },
  // D. RESOURCE-DRIVEN ADAPTATION: a (location, resourceCategory) pair
  // observed persistently unavailable accrues resource pressure --
  // applied by biasing any entity CURRENTLY present away, toward
  // another Vrindavan location that affords the SAME category (see
  // `findAlternateLocationForCategory` below). The engine
  // (@avatark/world-adaptation-runtime) never sees "yamuna" or "water"
  // -- only the generic composite `${locationId}:${category}` subject
  // key, the same convention lib/worldMemory/hostService.ts's own
  // `computeLocationConditionsByCategory` already established.
  {
    id: "avatark-adaptation-place-resource-scarcity-pressure",
    domain: "PLACE",
    signalKind: "RESOURCE_SCARCITY",
    threshold: 2,
    decayPerTick: 0.1,
    reversible: true,
    effect: { domain: "PLACE", kind: "RESOURCE_PRESSURE", magnitude: 1 },
    description: "A (location, resource category) pair observed persistently unavailable accrues bounded resource pressure, biasing present entities toward an alternate location affording the same category.",
  },
  // E. ENCOUNTER-FUTURE ADAPTATION: an EncounterRule repeatedly
  // realized (regardless of location/participants) accrues a bounded
  // world-possibility weight. Computed and persisted this sprint;
  // deliberately not yet consumed by resolveEncounterRealization's own
  // score (same honest deferral as C) -- requirement E's own concrete,
  // consumed proof instead runs entirely through rule B's relationship
  // -> band -> resolver path (see docs/SPRINT15_FINAL_REPORT.md).
  {
    id: "avatark-adaptation-encounter-rule-repeated-realization-weight",
    domain: "WORLD_POSSIBILITY",
    signalKind: "ENCOUNTER_INVOLVEMENT",
    threshold: 3,
    decayPerTick: 0.05,
    reversible: true,
    effect: { domain: "WORLD_POSSIBILITY", kind: "ENCOUNTER_WEIGHT_BIAS", magnitude: 1 },
    description: "An EncounterRule repeatedly realized accrues a bounded world-possibility weight, recorded for a future sprint's own realization-input wiring.",
  },
]

// Sprint 15: Host-layer-owned, Vrindavan-specific resource-affordance
// lookup -- the SAME "world-specific mapping lives outside the engine"
// discipline vrindavanPopulationDefinition.ts/vrindavanMemoryDefinition.ts
// already hold. Used only by lib/worldAdaptation/hostService.ts when
// applying rule D's own PLACE/RESOURCE_PRESSURE effect. `affordances`
// defaults to the real Vrindavan seed (every production call site omits
// it); the parameter exists so a test can prove the branching logic
// itself against a synthetic multi-provider affordance set, independent
// of whether the CURRENT Vrindavan seed happens to offer more than one
// location per resource category (as of this sprint, it does not --
// see docs/SPRINT15_FINAL_REPORT.md's honest scope note on rule D).
export function findAlternateLocationForCategory(currentLocationId: string, category: string, affordances = VRINDAVAN_RESOURCE_AFFORDANCES): string | null {
  const alternate = affordances.find((affordance) => affordance.locationId !== currentLocationId && affordance.resourceTags.includes(category as ResourceTag))
  return alternate?.locationId ?? null
}
