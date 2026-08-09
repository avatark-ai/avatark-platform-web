import type { ParticipationAuthorization, ParticipationRecord } from "@avatark/participation-contracts"
import { deriveParticipationRecordId, resolveParticipationAuthorization } from "@avatark/participation-runtime"
// Deliberately imported from the LEAF modules (durableSnapshot.ts,
// encounterRealization/singleton.ts), never from
// lib/worldPersistence/hostService.ts or lib/encounterRealization/hostService.ts
// directly: those two Host files sit on the wake-chain composition path
// that already imports lib/worldEmbodiment/intentDispatcher.ts (for
// `interact()`'s passthrough), and intentDispatcher.ts is this file's
// OWN caller (select-encounter). Importing the composed hostService
// files here would close a real circular-import loop
// (intentDispatcher.ts -> participation/hostService.ts ->
// worldPersistence/hostService.ts -> intentDispatcher.ts); importing
// the same underlying pure resolver + repository one layer down avoids
// it entirely while returning the identical data.
import { resolveDurableWorldSnapshot as getWorldSnapshot } from "../worldPersistence/durableSnapshot.ts"
import { encounterRecordRepository } from "../encounterRealization/singleton.ts"
import { participationRecordRepository } from "./singleton.ts"

const defaultNow = () => new Date().toISOString()

// Sprint 19, Phase 0 reconciled against real Sprint 16/17/18 code
// (docs/SPRINT19_IMPLEMENTATION_PREP.md §6/§7/§17): the ONE place
// `select-encounter` converges onto the authoritative, worldInstanceId-
// scoped durable family instead of Sprint 7's ephemeral, process-only
// singleton (lib/livingSystems/singleton.ts) -- the real "two competing
// world truths" this sprint's mission named. `getWorldSnapshot` (Sprint
// 9's own durable analogue of `resolveLivingSystemsSnapshot`) is called
// directly; the durable, `worldInstanceId`-scoped `AvailableEncounter`
// list it returns is re-resolved fresh on EVERY call (Phase 0 §18's own
// "never trust a stale snapshot" requirement), never cached.
//
// Deliberately does NOT call `wakeWorld`/`wakeWorldWithCanonicalEvents`/
// `advanceWorld`: `getWorldSnapshot` and `getEncounterRecords` are both
// lease-free reads (see lib/worldPersistence/hostService.ts's own
// `getWorldSnapshot` doc comment -- "a read never requires becoming the
// execution owner"). This is a REAL, discovered constraint, not a
// stylistic choice: `@avatark/world-persistence-runtime`'s
// `InMemoryWorldLeaseRepository.acquire` conflicts on ANY existing
// unexpired lease regardless of requesting owner (see
// packages/world-persistence-runtime/src/inMemoryLeaseRepository.ts),
// so a synchronous per-request wake here would make every concurrent
// visitor's participation attempt within the same world instance and
// lease TTL window throw `LeaseConflictError` -- see
// docs/SPRINT19_FINAL_REPORT.md's remaining-technical-debt section for
// why resolving that is Sprint 20 scope, not this file's.
//
// Bounded consequences (Phase 0's own core invariant, Sprint 19 mission
// restated): this function derives NO new WorldEvent, AdaptationEffect,
// EncounterRecord, or CanonicalEventProjection. The ONLY durable write
// anywhere in this file is the additive ParticipationRecord itself --
// the visitor's own evidence of a legitimate selection, never a second
// consequence-derivation authority. This is the exact same posture
// Sprint 18's `witnessCanonicalEvent` already holds for canonical events
// (a visitor-scoped witness of an ALREADY resolved fact, never a trigger
// for resolving it) -- ParticipationRecord is that same shape, one layer
// earlier: it may legitimately exist even when no EncounterRecord has
// ever been derived for the identical (ruleId, locationId) pair, because
// Sprint 7's own `AvailableEncounter` layer resolves with zero
// population/wake pass at all. `encounterRecordId` is populated
// opportunistically, when a real Sprint 14 EncounterRecord already
// exists; it stays honestly null otherwise, never fabricated.
export interface ParticipationOutcome {
  authorization: ParticipationAuthorization
  record: ParticipationRecord | null
}

export async function authorizeAndRecordParticipation(worldInstanceId: string, userId: string, ruleId: string, locationId: string, now: () => string = defaultNow): Promise<ParticipationOutcome> {
  const snapshot = await getWorldSnapshot({ worldInstanceId, userId, locationId, now })
  const match = snapshot.availableEncounters.find((e) => e.ruleId === ruleId)

  // Mirrors EncounterRecord.protectedNarrativeGateOpen's own predicate
  // (lib/encounterRealization/hostService.ts) exactly -- a rule that
  // isn't even live-available has no category to gate on, so the gate
  // is vacuously open and ENCOUNTER_NOT_AVAILABLE is the one reason
  // reported (resolveParticipationAuthorization's own precedence).
  const narrativeGateOpen = !match || match.category !== "narrative-protected" || snapshot.protectedNarrative.resolved

  const authorization = resolveParticipationAuthorization({ availableViaLiveSnapshot: match !== undefined, narrativeGateOpen })
  if (!authorization.authorized) return { authorization, record: null }

  const tick = snapshot.simulationTick

  // Pre-check-then-work (Phase 0 §21's own required discipline, the
  // identical posture deriveEncounterRecordId/deriveCanonicalActivationId
  // already hold): a retried identical selection at the identical tick
  // recomputes the identical id and returns the EXISTING record
  // unchanged -- nothing below this point re-runs.
  const id = deriveParticipationRecordId(worldInstanceId, userId, ruleId, locationId, tick)
  const existing = await participationRecordRepository.get(worldInstanceId, id)
  if (existing) return { authorization, record: existing }

  const encounterRecords = await encounterRecordRepository.listByLocation(worldInstanceId, locationId)
  const encounterRecord = encounterRecords.find((r) => r.ruleId === ruleId && (r.status === "REALIZED" || r.status === "CONSEQUENCES_APPLIED" || r.status === "REMEMBERED"))

  const record: ParticipationRecord = {
    id,
    worldId: worldInstanceId,
    userId,
    ruleId,
    locationId,
    participantEntityIds: snapshot.presentEntities.map((e) => e.id),
    tick,
    encounterRecordId: encounterRecord?.id ?? null,
    createdAt: now(),
  }
  await participationRecordRepository.save(record)
  return { authorization, record }
}

// Sprint 19: a Host-composed read -- no repository lookup happens
// outside this file's own `participationRecordRepository` singleton;
// the renderer/embodiment layer receives records through this function
// only, never by importing the singleton itself. Deliberately
// `listByUser`, never `listByWorld` exposed here -- a visitor's return-
// visit projection reads their OWN participation history, never anyone
// else's (Phase 0 §7's own "visitor meaningful-memory stays derive-only,
// per-visitor" requirement).
export async function getParticipationRecords(worldInstanceId: string, userId: string): Promise<ParticipationRecord[]> {
  return participationRecordRepository.listByUser(worldInstanceId, userId)
}
