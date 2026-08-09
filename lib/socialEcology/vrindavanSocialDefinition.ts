import type { GroupMembership, HomeRange, RelationshipState } from "@avatark/social-ecology-contracts"
import { COW_ARCHETYPE_ID, initialVrindavanGroups } from "../livingPopulation/vrindavanPopulationDefinition.ts"

// Sprint 12, Phase 4: a Host-layer, non-canonical judgment call -- the
// SAME two neutral cow entities Sprint 10 already seeded
// (vrindavanPopulationDefinition.ts), read here only, never
// re-declared. PARENT_OFFSPRING is a systems-vocabulary
// RelationshipType Sprint 12 itself defines, not a canonical family
// relationship from any franchise; naming one cow "parent" and the
// other "offspring" adds no narrative content (see
// docs/SPRINT12_GROUND_TRUTH.md's "no conflict found" section).
export const COW_PARENT_OFFSPRING_RELATIONSHIP_ID = "avatark-social-cow-parent-offspring"

export function initialVrindavanRelationships(worldId: string): RelationshipState[] {
  return [
    {
      id: COW_PARENT_OFFSPRING_RELATIONSHIP_ID,
      worldId,
      entityAId: `${COW_ARCHETYPE_ID}-1`,
      entityBId: `${COW_ARCHETYPE_ID}-2`,
      relationshipType: "PARENT_OFFSPRING",
      band: "WEAK",
      evidence: { coPresenceTicks: 0, sharedGroupTicks: 0, reunionCount: 0 },
      establishedTick: 0,
      // Sentinel, not a real tick: "no evidence has been recorded yet"
      // -- distinct from establishedTick (which IS meaningfully 0, the
      // world's own start). Lets the Host layer's own
      // `afterTick > lastRelevantTick` idempotent-replay guard treat
      // the very first wake (which may itself land on tick 0) as new
      // evidence, while a same-tick replay is correctly a no-op.
      lastRelevantTick: -1,
    },
  ]
}

// Sprint 12, Phase 5: audit-only identity records layered on Sprint
// 10's own already-seeded GroupState.memberEntityIds (see
// docs/SPRINT12_GROUND_TRUTH.md's "group membership stays audit-only"
// decision). The first member of each seeded group is designated
// REFERENCE_ENTITY -- an arbitrary-but-stable systems convention, not
// a leadership or authority claim.
export function initialVrindavanGroupMemberships(worldId: string): GroupMembership[] {
  return initialVrindavanGroups(worldId).flatMap((group) =>
    group.memberEntityIds.map((entityId, index) => ({
      id: `${group.id}-member-${entityId}`,
      worldId,
      groupId: group.id,
      entityId,
      role: index === 0 ? ("REFERENCE_ENTITY" as const) : ("MEMBER" as const),
      status: "ACTIVE" as const,
      establishedTick: 0,
      leftTick: null,
    })),
  )
}

// Sprint 12, Phase 4/7: each seeded group's own initial location IS its
// home range -- entities that wander are expected to eventually return
// to the place their group actually lives, without inventing any new
// location or preference StudioK hasn't already described.
export function initialVrindavanHomeRanges(worldId: string): HomeRange[] {
  return initialVrindavanGroups(worldId).map((group) => ({
    id: `${group.id}-home-range`,
    worldId,
    ownerType: "GROUP" as const,
    ownerId: group.id,
    preferredLocationIds: [group.locationId],
    establishedTick: 0,
  }))
}
