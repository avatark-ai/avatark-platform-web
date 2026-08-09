import type { RelationshipId } from "@avatark/social-ecology-contracts"
import type { WorldConsequence } from "@avatark/world-memory-contracts"

// Sprint 14, Phase 8: a closed, bounded consequence vocabulary -- no
// psychology, no moral score, no engagement/reputation field, matching
// the mission's own explicit constraint. Exactly two domains are wired
// this sprint (deliberately, "prove the mechanism, not exhaust the
// design space," the same scope discipline every prior sprint's own
// single-rule/single-fixture posture already established):
//
// - WORLD_MEMORY: forwards a plain, EXISTING `WorldConsequence`
//   (world-memory-contracts, unchanged) into the SAME
//   `deriveWorldEvents` pipeline every consequence in this whole domain
//   already flows through -- never a duplicated shape. A
//   RESOURCE_PREFERENCE consequence here is what lets a realized
//   encounter bias a participant's FUTURE destination, through Sprint
//   11's own already-existing `resolvePreferredResourceLocation` ->
//   `memoryHint` -> `selectBehavior` bridge -- zero new "future
//   behavior" mechanism required.
// - RELATIONSHIP: names an existing RelationshipId and asks Social
//   Ecology's own Host layer (lib/socialEcology/hostService.ts's new,
//   additive `applyEncounterEvidence`) to record one unit of
//   encounter-evidence for that relationship -- the SAME
//   evidence-then-band-derivation mechanism Sprint 12 already built,
//   never a parallel relationship graph.
//
// Entity-need/routine-intent/movement-intent consequences are
// deliberately NOT modeled as a direct write this sprint: Sprint 10's
// own EntityBehaviorState (needs, movement, activity) has exactly one
// writer, the population tick loop itself
// (packages/living-population-runtime/src/populationSimulation.ts) --
// reaching in from outside would create a second needs-mutation
// authority, exactly what every prior sprint's own ground-truth
// document warns against. "Changed future behavior" for an entity is
// instead expressed the same way Sprint 11 already expresses it: a
// RESOURCE_PREFERENCE WORLD_MEMORY consequence, read back in on a LATER
// tick via the existing memoryHint bridge, never a same-tick direct
// mutation. See docs/SPRINT14_GROUND_TRUTH.md's consequence-model
// section.
export type EncounterConsequence = { domain: "WORLD_MEMORY"; worldConsequence: WorldConsequence } | { domain: "RELATIONSHIP"; relationshipId: RelationshipId; kind: "ENCOUNTER_EVIDENCE" }
