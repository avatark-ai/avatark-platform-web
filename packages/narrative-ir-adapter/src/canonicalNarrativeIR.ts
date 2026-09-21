// Hand-mirrored type boundary onto the canonical Narrative IR authority --
// SOURCE AUTHORITY: avatark-ai/studiok-living-world-compiler, branch main,
// schemas/ir/v0/*.schema.json. CANONICAL IR: 0.3.0. CANONICALIZATION: 0.1.0.
// Ratified by PLT-ADR-007 / NC-IR-RECONCILE-01.
//
// Only the fields this package's translation layer actually reads are
// mirrored here -- this is deliberately not a full schema port. Not
// generated: the canonical repository has no JSON-Schema-to-TypeScript
// generation step today, and introducing one is out of scope for this
// migration (R05). Each type below cites the exact source file/field it
// mirrors; a future schema change to any cited field must update the
// matching type here (no drift-detection test exists yet -- see
// NARRATIVE_IR_AUTHORITY_STATUS.md for the open follow-up).

// schemas/ir/v0/action.schema.json -- {irVersion, id, kind, verb, sequenceIndex?}
export interface CanonicalAction {
  id: string
  kind: "ACTION" | "NON_ACTION"
  verb: string
  sequenceIndex?: number
}

// schemas/ir/v0/common.schema.json $defs/eventOrigin -- the per-Occurrence
// causal register (deliberately distinct from $defs/causalAttribution,
// which characterizes a Consequence's own causal chain -- see
// evidenceActorFromCanonical.ts for why this package translates only from
// eventOrigin, never from causalAttribution).
export type CanonicalEventOrigin = "CONSUMER_CAUSED" | "WORLD_PROCESS_CAUSED" | "OTHER_ENTITY_CAUSED" | "UNEXPLAINED"

// schemas/ir/v0/expected-pattern-state.schema.json -- {irVersion, presence,
// confidence, confirmationSequence}. World-pattern-origin only by design --
// there is no `id`/`subject`/`property` field on this node itself; it is
// always embedded in a containing PlaceMemory (keyed by that PlaceMemory's
// own placeId) rather than independently addressable.
//
// STK-WO-009 Phase C (G10C-3): `irVersion` is required by the real schema
// (part of its `required` array) but was missing from this hand-mirrored
// type until now -- a real, disclosed gap found during Phase B and closed
// here. Every existing canonical-fragment fixture already carries this
// field on its own expectedPatternState node (it was simply never read);
// no fixture needed to change.
export interface CanonicalExpectedPatternState {
  irVersion: string
  presence: "NEVER_PRESENT" | "PRESENT" | "TEMPORARILY_NOT_PRESENT" | "EXPECTED_BUT_MISSING"
  confidence: number
  confirmationSequence: readonly ("CONFIRMED" | "DISCONFIRMED")[]
}

// schemas/ir/v0/runtime-requirements.schema.json -- {irVersion, id, requires}.
// This document's own `id` is the closest canonical analog to the old
// STK-SPEC-007 Rule.id this package's ArtifactReference.ruleId used to
// carry -- confirmed by studiok-living-symphony-compiler's own
// LW_COMPILER_R03_REFERENCE_MAPPING.md, which named this exact gap as
// "not solved here -- explicitly out of scope (no runtime adapter
// migration in R03)" and deferred it to this gate.
export interface CanonicalRuntimeRequirementsDocument {
  id: string
  requires: readonly string[]
}

// scripts/compile-living-world-artifact.mjs's compile() result shape --
// {fixtureId} (the fixture-shaped document's own id) + the real SHA-256
// digest computed over its canonicalized bytes. Never a per-rule/per-event
// identity -- one digest per compiled fixture-shaped document (see
// Documentation/Compiler/LW-COMPILER-R02/LW_COMPILER_R02_ARTIFACT_IDENTITY_CONTRACT.md's
// "Identity boundary").
export interface CompiledArtifactIdentity {
  fixtureId: string
  digest: string
}

// schemas/ir/v0/visit-transition.schema.json -- {irVersion, kind, visitOrdinal?,
// relationshipDepth?}. R07: "Return is a structurally distinct transition
// from FirstEntry, not FirstEntry replayed with different data (RETURN !=
// RESET)." Deliberately carries NO worldId/userId/placeId/tick field of its
// own -- exactly as narrow as canonical Action (see actionOpportunityFromCanonical.ts's
// own comment on this pattern): identity and chronology remain host-supplied
// framing, never smuggled into this world-agnostic narrative marker.
// `visitOrdinal` is required when `kind` is RETURN and must be able to
// exceed 2 (schema note, citing EV-017) -- an architecture that only
// accepts exactly 2 is a defect. `relationshipDepth` is documented as
// "derived from RelationshipHistory length at lowering time; not
// independently stored here" -- carried through verbatim, never
// recomputed by this package.
export interface CanonicalVisitTransition {
  kind: "FIRST_ENTRY" | "RETURN"
  visitOrdinal?: number
  relationshipDepth?: number
}
