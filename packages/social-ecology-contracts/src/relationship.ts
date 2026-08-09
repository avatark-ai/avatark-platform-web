import type { EntityId } from "@avatark/living-systems-contracts"
import type { WorldId } from "@avatark/runtime-contracts"
import type { RelationshipId } from "./ids.ts"

// Sprint 12, Phase 3: a minimal, generic, OBSERVABLE-association
// taxonomy -- never invented psychology. No LOVE/GRIEF/JEALOUSY/
// LOYALTY/DEVOTION/TRUST/TRAUMA/FRIENDSHIP exists here, and none may be
// added without an Approved future specification explicitly defining
// its semantics (this sprint's own mission text, verbatim constraint).
export type RelationshipType = "PARENT_OFFSPRING" | "GROUP_MEMBER" | "FAMILIAR" | "PREFERRED_ASSOCIATE"

// Sprint 12, Phase 2: a coarse, evidence-derived strength tier --
// distinct from FamiliarityState's own band (familiarity.ts), which
// tracks per-pair EVIDENCE feeding into whether a FAMILIAR/
// PREFERRED_ASSOCIATE relationship gets established or upgraded in the
// first place. PARENT_OFFSPRING/GROUP_MEMBER relationships are
// grammar-seeded and still carry a band (reflecting how long/
// consistently the association has held), but never NEED familiarity
// evidence to exist.
export type RelationshipBand = "WEAK" | "ESTABLISHED" | "STRONG"

// Deliberately a small, closed, structured record -- never free-form
// metadata (Phase 2's own "avoid uncontrolled free-form metadata").
//
// Sprint 14, Phase 8: `encounterCount` is an ADDITIVE, OPTIONAL field --
// every existing `RelationshipEvidence` literal (seed data, prior
// sprints' own tests) keeps working unchanged and is read as 0. It
// counts realized encounters (Sprint 14's own EncounterRecord reaching
// REALIZED) between this relationship's two entities, distinct from
// `coPresenceTicks` (mere co-location, evolved every wake regardless of
// any encounter) -- a relationship consequence that is genuinely
// ABOUT an encounter having happened, not merely about the two entities
// having been in the same place.
export interface RelationshipEvidence {
  coPresenceTicks: number
  sharedGroupTicks: number
  reunionCount: number
  encounterCount?: number
}

// Sprint 12, Phase 2: representable independently from either entity's
// transient activity -- this record never references a tick's
// BehaviorIntent, only the two entities' stable identity and the
// evidence/band describing the association itself.
export interface RelationshipState {
  id: RelationshipId
  worldId: WorldId
  entityAId: EntityId
  entityBId: EntityId
  relationshipType: RelationshipType
  band: RelationshipBand
  evidence: RelationshipEvidence
  establishedTick: number
  lastRelevantTick: number
}

export type AppendRelationshipResult = { status: "appended" | "duplicate_ignored" }

export interface RelationshipRepository {
  save(relationship: RelationshipState): Promise<void>
  get(worldId: WorldId, relationshipId: RelationshipId): Promise<RelationshipState | null>
  listByEntity(worldId: WorldId, entityId: EntityId): Promise<RelationshipState[]>
  listByType(worldId: WorldId, relationshipType: RelationshipType): Promise<RelationshipState[]>
}
