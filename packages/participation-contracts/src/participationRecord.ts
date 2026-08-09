import type { EncounterRuleId, EntityId } from "@avatark/living-systems-contracts"
import type { EncounterRecordId } from "@avatark/encounter-realization-contracts"
import type { LocationId, UserId, WorldId } from "@avatark/runtime-contracts"
import type { ParticipationRecordId } from "./ids.ts"

// Sprint 19, Phase 0 §13/§21 (reconciled): a ParticipationRecord is the
// visitor's own durable, additive evidence of choosing to engage with an
// encounter the world ALREADY, independently made available -- it is
// never a second consequence-derivation authority. This is the exact
// same posture Sprint 18's VisitorCanonicalEventWitness holds for
// canonical events (a visitor-scoped witness of an already-resolved
// fact, never a trigger for resolving it) -- ParticipationRecord is that
// same shape, one layer earlier: it may exist even before any
// EncounterRecord has been derived for the identical (ruleId,
// locationId) pair (Sprint 7's own AvailableEncounter layer resolves
// with no population/wake pass at all -- see
// docs/SPRINT19_FINAL_REPORT.md's persistence-semantics section), in
// which case `encounterRecordId` stays null, honestly, rather than being
// fabricated.
//
// `userId` is the ONE new identity dimension this domain introduces --
// it sits alongside `participantEntityIds`, never inside it.
// `EntityId` space is never widened to admit a visitor (Phase 0 §4's own
// explicit invariant, reconfirmed unchanged by Sprint 16/17/18).
export interface ParticipationRecord {
  id: ParticipationRecordId
  worldId: WorldId
  userId: UserId
  ruleId: EncounterRuleId
  locationId: LocationId
  // Entities present at `locationId`, per durable world state, at the
  // moment this record was created -- informational context for the
  // visitor's own record, never itself a consequence-bearing list (no
  // write boundary reads this field).
  participantEntityIds: EntityId[]
  tick: number
  // Null when only Sprint 7's coarse AvailableEncounter layer had
  // resolved at creation time; populated when a real, content-derived
  // EncounterRecord already existed for the identical (ruleId,
  // locationId) pair. Never retroactively backfilled by this domain --
  // a later wake's own EncounterRecord remains independently readable
  // by locationId, this field is a best-effort link, not the source of
  // truth for whether realization happened.
  encounterRecordId: EncounterRecordId | null
  createdAt: string
}

export interface ParticipationRecordRepository {
  save(record: ParticipationRecord): Promise<void>
  get(worldId: WorldId, id: ParticipationRecordId): Promise<ParticipationRecord | null>
  listByUser(worldId: WorldId, userId: UserId): Promise<ParticipationRecord[]>
  listByWorld(worldId: WorldId): Promise<ParticipationRecord[]>
}
