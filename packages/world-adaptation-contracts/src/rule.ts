import type { AdaptationDomain } from "./domain.ts"
import type { AdaptationSignalKind } from "./signal.ts"
import type { AdaptationRuleId } from "./ids.ts"
import type { EntityAdaptationEffectKind, RelationshipAdaptationEffectKind, PlaceAdaptationEffectKind, GroupAdaptationEffectKind, WorldPossibilityAdaptationEffectKind } from "./effect.ts"

// Sprint 15: the EFFECT an AdaptationRule produces once triggered,
// bound to the SAME domain as the rule itself -- the subject
// (entityId/relationshipId/locationId/groupId/ruleId) is filled in at
// decision time from the pressure's own subjectId, never authored here;
// this template only names WHICH kind of typed effect and its base
// magnitude.
export type AdaptationEffectTemplate =
  | { domain: "ENTITY"; kind: EntityAdaptationEffectKind; magnitude: number }
  | { domain: "RELATIONSHIP"; kind: RelationshipAdaptationEffectKind; magnitude: number }
  | { domain: "PLACE"; kind: PlaceAdaptationEffectKind; magnitude: number }
  | { domain: "GROUP"; kind: GroupAdaptationEffectKind; magnitude: number }
  | { domain: "WORLD_POSSIBILITY"; kind: WorldPossibilityAdaptationEffectKind; magnitude: number }

// Sprint 15, mission's own "ADAPTATION MODEL" section -- an
// AdaptationRule makes explicit every one of the mission's required
// facets: inputs/evidence (`signalKind`), eligibility (`domain` must
// match the signal's own domain), a bounded threshold condition
// (`threshold`), the resulting adaptation (`effect`), the affected
// domain (`domain`), persistence semantics (accumulated in
// AdaptationPressure, materialized as AdaptationEffect), provenance
// (every produced effect carries `causalReferences`), and
// reversibility/decay (`reversible`, `decayPerTick`).
//
// Rules are DATA, never a hardcoded branch inside
// @avatark/world-adaptation-runtime -- exactly the same "world-specific
// config lives in a Host-layer definition file" discipline
// vrindavanMemoryDefinition.ts/vrindavanPopulationDefinition.ts already
// established, so a wholly different Living World can supply its own
// rule set without touching this package (see
// lib/worldAdaptation/vrindavanAdaptationDefinition.ts and this
// package's own livingForestAdaptationPortability fixture).
export interface AdaptationRule {
  id: AdaptationRuleId
  domain: AdaptationDomain
  signalKind: AdaptationSignalKind
  // Accumulated AdaptationPressure.value at or above this crosses into
  // tier 1; at or above 2x this into tier 2, and so on -- see
  // @avatark/world-adaptation-runtime's own `evaluateAdaptationRule`.
  threshold: number
  // How much AdaptationPressure.value decays per elapsed tick with no
  // reinforcing signal. 0 means the pressure never decays (a
  // permanent/irreversible tendency once earned).
  decayPerTick: number
  reversible: boolean
  effect: AdaptationEffectTemplate
  description: string
}
