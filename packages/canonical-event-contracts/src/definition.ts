import type { CanonicalEventActivationCondition } from "./activationCondition.ts"
import type { CanonicalEventIdentity } from "./identity.ts"
import type { MandatedFact } from "./mandatedFact.ts"
import type { CanonicalEventProjectionScope } from "./scope.ts"
import type { CanonicalEventProvenance } from "./provenance.ts"

// Sprint 18, Phase 0 §9: REQUIRED events must eventually activate in
// every world instance that reaches their authored activation window
// (their own eligibility conditions are therefore restricted to
// non-emergent, monotonically-reachable facts so they cannot be
// starved); OPTIONAL events are legitimately skippable for a given
// world instance. The WORLD-DEPENDENT PRESENTATION CONDITION category
// from Phase 0's own table is deliberately NOT modeled as a third
// activation-gating category here -- it governs only HOW an
// already-activated event presents, never WHETHER it activates, so it
// is out of scope for this closed union (a future presentation-layer
// concern, not an activation concern).
export type CanonicalEventCategory = "REQUIRED" | "OPTIONAL"

// Sprint 18, Phase 0 §4: authored StudioK content. `CanonicalEventDefinition`
// is NEVER mutable at runtime -- deliberately no repository interface
// exists for it at all (not even a get-only one), mirroring
// `@avatark/living-systems-contracts`' own `ProtectedNarrativeStateRepository`
// get-only shape in the strongest possible way: there is no write
// METHOD to omit because there is no repository. A `CanonicalEventDefinition[]`
// is plain, Host-authored, world-grammar data -- the SAME "just data,
// passed in" convention `AdaptationRule[]`/`SpatialGrammar` already use
// (see lib/canonicalEvents/vrindavanCanonicalEventDefinition.ts). All
// authored conditions must hold (logical AND) for eligibility -- no
// boolean expression tree is invented; an event needing OR-shaped
// eligibility is modeled as two separate `CanonicalEventDefinition`
// entries sharing one `canonicalEventId` prefix, a decision deferred
// until a concrete authored scenario actually needs it.
export interface CanonicalEventDefinition {
  identity: CanonicalEventIdentity
  category: CanonicalEventCategory
  activationConditions: CanonicalEventActivationCondition[]
  mandatedFacts: MandatedFact[]
  scope: CanonicalEventProjectionScope
  provenance: CanonicalEventProvenance
}
