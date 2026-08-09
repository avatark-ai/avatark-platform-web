---
sprint: 19
phase: implementation-prep
title: Visitor <-> Living World Participation -- Reconciliation Against Real Sprint 16/17 Code
status: PREP COMPLETE -- BLOCKED ON SPRINT 18 CLOSURE
base: feature/sprint17-implementation-prep @ 40a3fc7
reconciles: docs/SPRINT19_PHASE0_VISITOR_WORLD_PARTICIPATION_ARCHITECTURE.md (feature/sprint19-phase0-visitor-participation @ 8f9c480)
---

# Sprint 19 Implementation Prep

Reconciles Sprint 19 Phase 0 against the **real, landed** Sprint 16 spatial-ecology code and
Sprint 17 crash-recovery fix (`feature/sprint17-implementation-prep @ 40a3fc7`, 1514/1514
tests), and the real Sprint 7-15 runtime Phase 0 already researched. Every identifier below
was read directly from source at `40a3fc7`. Sprint 18 (canonical events) is currently
**in-progress, uncommitted, in a separate worktree** -- its APIs are treated as provisional
throughout, per instruction; nothing here asserts a Sprint 18 identifier that isn't already
committed in `docs/SPRINT18_PHASE0_CANONICAL_EVENT_ARCHITECTURE.md` (`47cb0e1`) or
`docs/SPRINT18_IMPLEMENTATION_PREP.md` (docs-only, committed content read for design intent
only).

**New finding, not in Phase 0** (see §27/§28): the real production visitor-facing path and
Sprint 14-17's realization/adaptation/spatial machinery are **two structurally distinct world
models today**, not one system with a wiring gap. This is more load-bearing than any single
section below and changes the sequencing of the whole plan -- read §27 first if short on time.

---

## 1. Visitor intent boundary

Unchanged from Phase 0 §1/§3/§4: `InteractionIntent` (`packages/world-embodiment-contracts/
src/interactionIntent.ts:17-52`) is the sole boundary -- `EnterWorldIntent | LeaveWorldIntent |
VisitLocationIntent | BeginReflectionIntent | SelectEncounterIntent`, each `{type, userId,
worldId, ...ids}`, no `apply()`/`execute()` method, confirmed unmodified by Sprint 16/17
(neither touched `world-embodiment-contracts`). Sprint 19 adds no new variant -- the union is
already closed over exactly the actions the mission names.

## 2. Authorization boundary

Unchanged from Phase 0 §5: `isWellFormedInteractionIntent` -> `validateInteractionIntent` ->
(proposed) `ParticipationAuthorization` -> `resolveEncounterRealization`, confirmed still the
real shape of `dispatchInteractionIntent` (`lib/worldEmbodiment/intentDispatcher.ts:24-41`) at
`40a3fc7` -- neither Sprint 16 nor Sprint 17 touched this file. `ParticipationAuthorization` is
the one new gate; nothing below it in the chain changes.

## 3. ParticipationRecord semantics

Unchanged from Phase 0 §13: additive sibling to `EncounterRecord`
(`packages/encounter-realization-contracts/src/encounterRecord.ts:41-52`, confirmed real
fields `id/worldId/... /status: EncounterRealizationStatus`, and the status union itself --
`REALIZING/REALIZED/CONSEQUENCES_APPLIED/REMEMBERED/EXPIRED/BLOCKED/SUPERSEDED`
(`encounterRecord.test.ts:5`) -- confirmed untouched by Sprint 16/17). `ParticipationRecord`
reuses this exact closed status union, per Phase 0's own design. Identity discipline
(`deriveParticipationRecordId`) mirrors the real, confirmed `deriveEncounterRecordId(worldId,
ruleId, locationId, participantEntityIds, startTick)` (`packages/encounter-realization-runtime/
src/encounterIdentity.ts:15`) with `userId` added to the hash input, exactly as Phase 0 §21
proposed -- confirmed order-independence over participant ids is a real, tested property
(`encounterIdentity.test.ts:9`) worth preserving in the new derivation too, though a visitor
selection has only one participant (the visitor), so order-independence is moot for
`ParticipationRecord` itself.

## 4. Visitor identity vs simulated entity identity

Unchanged and reconfirmed real at `40a3fc7`: `EncounterOpportunity` (`packages/
living-population-contracts/src/encounterOpportunity.ts:11-17`) has exactly the five fields
Phase 0 cited -- `ruleId, locationId, category, contributingEntityIds: EntityId[], tick` --
zero visitor field, untouched by Sprint 16/17. A visitor is never coerced into `EntityId`
space. `ParticipationRecord.userId` remains the one new identity dimension, sitting alongside
(never replacing) `EntityId` in `causalReferences`.

## 5. Visitor presence/arrival/departure

Unchanged from Phase 0 §8: `VisitorContextProjection { userId, lastLocationId,
meaningfulEncounterCount, reflectionCount }` remains the ceiling, no session/socket field.
Confirmed Sprint 16/17 did not touch `living-systems-contracts`/`living-systems-runtime` at
all (neither final report lists that package). **However** (see §27): the production
`enter-world`/`leave-world` intents resolve through `kernel.livingWorld` (`@avatark/
living-world-runtime`'s `WorldRuntime`, Sprint 5/6), not through Sprint 9-17's durable,
`worldInstanceId`-scoped world-persistence lifecycle (`lib/worldPersistence/hostService.ts`).
Presence today is real and correctly minimal, but it is presence *in the singleton Living
Systems world*, not presence *in a durable world instance* -- these are not yet the same
world model.

## 6. Navigation through real Sprint 16 spatial APIs

**RECONCILED.** Phase 0 §9 deferred this ("SUBJECT TO SPRINT 16 RECONCILIATION") because
Sprint 16 didn't exist yet. It now does: `DomainId/SectorId/QuadrantId/PatchId/LocalPlaceId`
are real, plain-string-alias types (`packages/spatial-ecology-contracts/src/ids.ts`), and (per
`docs/SPRINT18_IMPLEMENTATION_PREP.md` §8, independently reusable here) `LocationId ->
{localPlaceId, patchId, quadrantId, sectorId, domainId}` resolution already exists via
`buildSpatialMembershipIndex` (`packages/spatial-ecology-runtime/src/membershipIndex.ts`).
Phase 0's own commitment holds exactly as written: `VisitLocationIntent.locationId` stays the
sole addressable unit visitors ever name; `LocalPlaceId` is a 1:1 bridge resolved by the
existing membership index, never a second identity a visitor must supply. **No new intent
variant is needed** -- confirmed, not just proposed. Caveat: Sprint 16's spatial-ecology
package family (`packages/spatial-ecology-*`, `lib/spatialEcology/hostService.ts`) is itself
part of the **durable** world-persistence family (`wakeWorldWithSpatialEcology(worldInstanceId,
ownerId, ...)`, §100 of that file) -- see §27 for why this matters more than it looks like it
should.

## 7. Encounter participation

**RECONCILED, with a correction to Phase 0's own framing.** Phase 0 §13 is right that
`resolveEncounterRealization` (`packages/encounter-realization-runtime/src/
encounterRealizationResolution.ts:70`) and `deriveConsequences` (`.../consequenceDerivation.ts:
26`) are real, unmodified by Sprint 16/17, and input-shape-agnostic. What Phase 0 calls "the
real net-new surface... this is wiring, not a new taxonomy" undersells the gap: the *caller*
these functions need is `wakeWorldWithEncounterRealization(worldInstanceId, ownerId, ...)`
(`lib/encounterRealization/hostService.ts:69`) -- part of the durable, multi-instance world
family. The production `select-encounter` intent handler today (`intentDispatcher.ts:59-68`)
calls neither of these; it calls `resolveLivingSystemsSnapshot` (`lib/livingSystems/
orchestrator.ts:20`), which reads a **singleton** shared-world-state (`getOrInitSharedWorldState`,
`WORLD_ID` constant, `lib/livingSystems/singleton.ts`) via `kernel.livingWorld: WorldRuntime`
(Sprint 5/6), and only checks `availableEncounters` -- it has no path into Sprint 14's
realization/consequence engine at all. Closing this gap is not "wire `SelectEncounterIntent` to
`resolveEncounterRealization`" in the abstract -- it is "decide whether the production
visitor-facing route moves onto the durable, `worldInstanceId`-scoped family, or Sprint 14's
engine grows a singleton-compatible entry point." §27 recommends the former.

## 8. Consequence integration

Unchanged from Phase 0 §15/§16: `deriveConsequences` output is the same closed
`EncounterConsequence` union -- confirmed real and unmodified at `40a3fc7`:
`{domain: "WORLD_MEMORY"; worldConsequence} | {domain: "RELATIONSHIP"; relationshipId; kind:
"ENCOUNTER_EVIDENCE"}` (`packages/encounter-realization-contracts/src/consequence.ts:40`).
Sprint 16 did not touch this file (confirmed, `SPRINT16_FINAL_REPORT.md` §3: "No existing
Sprint 7-15 package was modified"). No new consequence domain is added for participation --
same conclusion Sprint 18 Phase 0 reached for canonical events (`docs/
SPRINT18_PHASE0_CANONICAL_EVENT_ARCHITECTURE.md` §16), now tripled: three independent sources
(emergent, canonical, visitor-participatory) all resolve through one unmodified union.

## 9. World Memory integration

Unchanged from Phase 0 §15: `wakeWorldWithMemory` (`lib/worldMemory/hostService.ts:64`)
confirmed real, unmodified signature at `40a3fc7`, same as cited in `docs/
SPRINT18_IMPLEMENTATION_PREP.md` §7. `ParticipationRecord`'s consequences flow through the
existing `deriveWorldEvents` pipeline the identical way Sprint 18's canonical events do --
confirmed by inspection, not assumed: no `deriveWorldEvents` call site branches on consequence
source today.

## 10. World Adaptation integration

Unchanged from Phase 0 §15 ("no new coupling needed... per Sprint 18 Phase 0's identical §17
finding"): `wakeWorldWithAdaptation` (`lib/worldAdaptation/hostService.ts:149`) consumes
`WorldEvent.causalReferences` -- confirmed real, unmodified. A `ParticipationRecord`-caused
`WorldEvent` biases future `AdaptationEffect`s through the exact same seam an emergent or
canonical `WorldEvent` does, with zero new `AdaptationSignal` kind required.

## 11. Long-horizon return semantics

**RECONCILED.** Phase 0 §22's STOP-gate caveat is resolved for the *durable* family: the
crash-recovery fix (Sprint 17, `40a3fc7`) splits `wakeWorld()` into `catchUpCausalEnvironment()`
+ `commitWakeCompletion()` (`lib/worldPersistence/hostService.ts:68,162`), and
`wakeWorldWithSpatialEcology` -- the real outermost composed layer today -- makes the **one and
only** `commitWakeCompletion` call for the entire chain (`lib/spatialEcology/hostService.ts:
92-113`), confirmed by comment and call site. `resolveTicksToApply` (`packages/
world-persistence-runtime/src/wakeCatchUpPlanner.ts`) prevents both the original lost-ticks bug
and the double-count a naive fix would reintroduce. Phase 0's own required invariant --
"`ParticipationRecord` realization must be sequenced strictly after the last-fully-evolved-tick
marker is committed" -- now has a real, named commit point to sequence after:
`commitWakeCompletion`'s return. **But** this composed chain is not yet wired to any
visitor-facing route: it is exercised only by tests and one dev-only route
(`app/api/dev/account/living-vrindavan/persistence/wake-full/route.ts`, confirmed real, not a
placeholder). See §27.

## 12. Private reflection firewall

Unchanged from Phase 0 §6, and stronger than Phase 0's own framing suggests: `BeginReflectionIntent`
(`interactionIntent.ts:35-40`) is confirmed real and unmodified by Sprint 16/17.
`PrivateReflectionRepository` remains proposed, additive, structurally unreachable from every
simulation resolver -- the same "regex-scan for zero imports" technique
`docs/SPRINT18_IMPLEMENTATION_PREP.md` §5 extends for canonical-event definitions extends here
a third time: assert no import of the reflection-content module from `living-systems-runtime`,
`encounter-realization-runtime`, `world-adaptation-runtime`, `social-ecology-runtime`, or (new,
Sprint 16) `spatial-ecology-runtime`.

## 13. Visitor meaningful-memory

Unchanged from Phase 0 §7: keep `VisitorWorldMemory` derive-only. Confirmed at `40a3fc7`:
`packages/living-systems-contracts/src/visitorMemory.ts:11-22` (the exact shape Phase 0 cited),
and `lib/livingSystems/visitorMemoryProjection.ts:30-53` still does not call `.save()` --
confirmed by reading the full function body, which derives fresh from `WorldState` +
`ExperienceEvent` every call, with an explicit comment: the repository's `.save()` is "a
legitimate reference implementation for a future world with no existing state," deliberately
unused "to avoid duplicate persistence." Sprint 16/17 did not touch this file. Recommendation
unchanged: keep derive-only, enforce by a structural test asserting no Sprint 19 runtime module
calls `VisitorWorldMemoryRepository.save`.

## 14. Protected Canon firewall

Unchanged from Phase 0 §1/§23, reconfirmed real at `40a3fc7`: `ProtectedNarrativeStateRepository`
(`packages/living-systems-contracts/src/protectedNarrative.ts`) has only `get(worldId)` --
confirmed, no write method exists on the interface at all, matching `docs/
SPRINT18_IMPLEMENTATION_PREP.md` §5's identical finding for the same file. `ParticipationAuthorization`
re-checks the same `protectedNarrativeGateOpen`/`NARRATIVE_GATE_OPEN` condition Sprint 18
Phase 0 defines (still provisional pending Sprint 18's actual runtime), exactly as Phase 0 §23
proposed -- no new gate mechanism.

## 15. Multi-visitor concurrency

Unchanged from Phase 0 §19: cross-visitor isolation confirmed real and tested
(`lib/livingSystems/orchestrator.test.ts:59-79`, untouched by Sprint 16/17). Conflicting
simultaneous `ParticipationRecord` writes resolve via the same `DurableWorldStateRepository.
conditionalSave` optimistic lock Sprint 9 established -- confirmed the interface still exists
unmodified in the world-persistence-contracts package at `40a3fc7`.

## 16. Stale intent handling

Unchanged from Phase 0 §18: re-resolve live availability at dispatch time, never trust
snapshot age. No explicit version guard is needed for the availability check itself (naturally
idempotent-safe by re-deriving from scratch); the explicit guard lives at the persistence layer
(`conditionalSave`'s `expectedVersion`), confirmed unmodified.

## 17. Idempotency/retry

Unchanged from Phase 0 §21 (see §3 above for the real `deriveEncounterRecordId` signature this
mirrors). Pre-check-then-work ordering is the confirmed real discipline
(`deriveEncounterRecordId` checked before any work runs, per Phase 0's own research) --
`deriveParticipationRecordId` must follow it identically: no consequence derivation runs until
the id lookup confirms no prior `ParticipationRecord` exists.

## 18. Checkpoint/replay

**RECONCILED, and Sprint 19 should NOT imitate Sprint 18's checkpoint extension.**
`WorldCheckpoint` (`packages/world-persistence-contracts/src/checkpoint.ts:21-32`) confirmed
real: `{id, worldInstanceId, checkpointVersion, stateVersion, tick, sharedState, entities,
eventSequenceAsOf, reason, createdAt}` -- no `territoryClaims` field (Sprint 16 declined one,
per `docs/SPRINT18_IMPLEMENTATION_PREP.md` §9) and, as of this writing, no
`canonicalProjectionHistory` field either (Sprint 18's addition is still uncommitted). Unlike
Sprint 18's canonical-event activations (whose consequences are not re-derivable from other
durable state, justifying their checkpoint field), a `ParticipationRecord` is a full,
content-hashed durable row -- structurally identical in this respect to `EncounterRecord`,
which has never needed a `WorldCheckpoint` field of its own. **Recommendation: Sprint 19 adds
no field to `WorldCheckpoint`.** Replay safety comes from the same source `EncounterRecord`
already gets it from: the pre-check-then-work id lookup (§17), not a checkpoint-carried list.
This also avoids two sprints editing the same file's shape independently (§27).

## 19. worldInstanceId isolation

Unchanged from Phase 0 §19/§38 proof O, reconfirmed by Sprint 16's own real multi-instance
proof (`SPRINT16_FINAL_REPORT.md` §17, `world-16-multi-instance-a/-b`). `ParticipationRecord`
must follow the identical `worldInstanceId`-scoped repository shape (`listByWorld`-style) --
but see §27: this presumes `ParticipationRecord` lives in the durable family, which is a
prerequisite decision, not a given.

## 20. Renderer neutrality

Unchanged from Phase 0 §25, reconfirmed: `interactionIntent.ts`'s header comment and structure
confirmed real and untouched by Sprint 16/17 -- no React/DOM/Unreal/Blueprint type anywhere in
`world-embodiment-contracts`. `ParticipationRecord`/`ParticipationAuthorization` must hold the
same discipline Sprint 16's `SpatialSnapshot`/`SpatialDelta` and Sprint 18's
`CanonicalEventProjection` already do (`docs/SPRINT18_IMPLEMENTATION_PREP.md` §11): ids, enums,
`CausalReference`-shaped provenance only.

## 21. Web/Unreal semantic parity

Unchanged from Phase 0 §26: one `SelectEncounterIntent` shape, one `dispatchInteractionIntent`
call path regardless of renderer origin -- confirmed `intentDispatcher.ts` has no
renderer-conditional branch anywhere in its real source.

## 22. Vrindavan proof

Grounded in real seeded state: `LIVING_VRINDAVAN_DEFINITION`
(`lib/livingWorldRuntime/vrindavanDefinition.ts`) and `LIVING_VRINDAVAN_ENCOUNTER_RULES`/
`LIVING_VRINDAVAN_ENTITY_ARCHETYPES`/`LIVING_VRINDAVAN_SEASONS`
(`lib/livingSystems/systemsDefinition.ts`), both confirmed real and imported by the live
`intentDispatcher`/`orchestrator.ts` today. Scenario: visitor sends `EnterWorldIntent`, then
`VisitLocationIntent` to a location exposing an available `EncounterRule` via
`resolveAvailableEncounters` (Sprint 7, inside `resolveWorldSnapshot`), then
`SelectEncounterIntent` with that `ruleId`/`locationId`. Once wired per §27's recommended
target family: `ParticipationAuthorization` re-resolves live availability, passes;
`resolveEncounterRealization` runs unmodified, reaches `REALIZED`; `deriveConsequences`
produces a `WORLD_MEMORY` consequence targeting the encountered entity's `EntityId`; the
existing sole-writer functions apply it; the visitor's derived `VisitorWorldMemory` projection
subsequently shows this encounter in `meaningfulEncounters` on next fetch.

## 23. Living Forest portability proof

Grounded in the four real fixtures Phase 0 §31 already verified and I re-confirmed exist at
`40a3fc7`: `otherWorldGrammar.test.ts` (Sprint 7), `livingForestPortability.test.ts` (Sprint 9,
now also carrying Sprint 17's crash-recovery-retry proof per that commit's diff stat),
`livingForestPopulationPortability.test.ts` (Sprint 10), `alternateWorldEmbodiment.test.ts`
(Sprint 8). A fifth fixture, following the identical pattern -- a `living-forest` world
definition exercising `resolveEncounterRealization` via a visitor-originated
`ParticipationRecord` rather than an emergent `EncounterOpportunity` -- proves Sprint 19's
addition is equally world-neutral. `ParticipationRecord`/`ParticipationAuthorization` reference
only `WorldId`/`LocationId`/`EncounterRuleId`/`EntityId`/`CausalReference` -- confirmed
world-neutral identifier types, same ones the four existing fixtures already exercise.

## 24. Persistence requirements

Unchanged from Phase 0 §37: `participation_records` table mirroring `encounter_records`'
existing shape; `private_reflections` table, owner-only RLS, no service-role read path. No
migration touches `world_events`/`entity_memory_entries`/`relationship_state`. Per §18 above,
no `WorldCheckpoint` schema change is proposed for participation.

## 25. Migration posture

No migration is applied by this document (docs-only prep, per instruction). Sprint 16's own
migration 033 was prepared but not applied (per handoff state); Sprint 19's eventual migration
should be sequenced after Sprint 16's, and after whatever migration Sprint 18's canonical
events require, to avoid two sprints racing to add columns/tables in the same review window.

## 26. Exact dependency on Sprint 18

**Provisional, shape-only** -- Sprint 18 implementation is uncommitted as of this writing.
Sprint 19 needs, at minimum: (a) confirmation of whatever the real outermost composed wake
function is once Sprint 18 lands (currently `wakeWorldWithSpatialEcology`; Sprint 18's own prep
doc, §15 task 6, proposes adding `wakeWorldWithCanonicalEvents` on top of it -- if that lands,
it becomes the new outermost layer and the one that should make the single
`commitWakeCompletion` call, not `wakeWorldWithSpatialEcology` directly); (b) the real shape of
`protectedNarrativeGateOpen`/`NARRATIVE_GATE_OPEN` once Sprint 18 implements it (§14 above
currently cites only the Sprint 14 `get()`-only repository, which is real; the gate-condition
check itself is still a Sprint 18 deliverable). No Sprint 18 function/type name not already
committed in its two docs is asserted anywhere in this document.

## 27. Collision audit

Two collisions, one already visible in committed docs, one newly found here:

1. **Outermost wake layer.** Sprint 18's implementation prep (`docs/SPRINT18_IMPLEMENTATION_PREP.md`
   §15 task 6) plans `wakeWorldWithCanonicalEvents` composing on top of
   `wakeWorldWithSpatialEcology` -- today's sole caller of `commitWakeCompletion`
   (`lib/spatialEcology/hostService.ts:113`). If Sprint 19 also needs a wake-chain layer (it
   does not, strictly -- participation realization is dispatch-triggered, not wake-triggered,
   per §7/§11), it must never independently wrap `wakeWorldWithSpatialEcology` a second time;
   it must attach beyond whatever Sprint 18 lands as the real outermost function (§26). Since
   Sprint 18 closes first, task 1 below re-verifies this before anything else.
2. **WorldCheckpoint edits (new finding).** Sprint 18 proposes adding `canonicalProjectionHistory`
   to `WorldCheckpoint` (`docs/SPRINT18_IMPLEMENTATION_PREP.md` §9). Sprint 19, per §18 above,
   proposes **no** field addition to the same file. This is a deliberate asymmetry, not an
   oversight -- stated explicitly here so a reviewer sequencing both sprints' PRs doesn't
   expect a second edit to `checkpoint.ts` that isn't coming.
3. **World-model family (the real, previously-undocumented collision).** Sprint 14-17's
   realization/memory/adaptation/spatial machinery is built entirely on the durable,
   `worldInstanceId`-scoped `world-persistence` family. The live, visitor-facing
   `intentDispatcher` route is built entirely on the singleton `living-systems`/`living-world-runtime`
   family (`kernel.livingWorld`, `WORLD_ID` constant, no `worldInstanceId` anywhere in that call
   path -- confirmed by reading `lib/livingSystems/orchestrator.ts` and `intentDispatcher.ts` in
   full). **Every sprint from 9 through 18 has been building consequence/memory/adaptation/
   spatial/canonical-event machinery on a world model the real production visitor route does not
   use yet.** This is not a Sprint 19-specific problem, but Sprint 19 is the first sprint whose
   entire mission (visitor participation) cannot ship without crossing this boundary, so it is
   the first sprint that must actually resolve it rather than working alongside it. Flagged as
   the top item for explicit sign-off before implementation (§29 gate 1).

## 28. Ordered implementation sequence

1. **Resolve §27's world-model-family collision first** -- get explicit product/architecture
   sign-off on whether the production `intentDispatcher` route migrates to the durable,
   `worldInstanceId`-scoped family (recommended: this is the only family with real multi-instance
   isolation, adaptation, and spatial ecology), or Sprint 14's engine grows a
   singleton-compatible adapter. Every task below assumes the former; if the latter is chosen,
   tasks 3-7 change shape.
2. Re-verify §11/§26 against Sprint 18's actual closing commit -- confirm the real outermost
   wake function name and whether `protectedNarrativeGateOpen` exists as specified.
3. Migrate (or bridge) the production `enter-world`/`leave-world`/`visit-location` intent
   handlers (`lib/worldEmbodiment/intentDispatcher.ts`) from `kernel.livingWorld`/
   `resolveLivingSystemsSnapshot` onto the durable `worldInstanceId`-scoped equivalents
   (`getWorldSnapshot`/`getEmbodimentSnapshot` from `lib/worldPersistence/hostService.ts` and
   its wake chain), preserving the existing session-authenticated `userId` override.
4. Create `packages/encounter-realization-contracts/src/participationRecord.ts` and
   `participationAuthorization.ts` (types only, per Phase 0 §36) -- `ParticipationRecord`,
   `ParticipationAuthorization`, `ParticipationPrecondition`.
5. Create `packages/encounter-realization-runtime/src/participationIdentity.ts`
   (`deriveParticipationRecordId`, mirroring `encounterIdentity.ts:15`) and
   `participationAuthorization.ts` (pure fn, re-resolves live availability per §16).
6. Wire `SelectEncounterIntent` in `intentDispatcher.ts`'s `select-encounter` case to call
   `ParticipationAuthorization` then `resolveEncounterRealization`/`deriveConsequences` against
   the durable family (post-task-3), replacing today's availability-only check.
7. Create `lib/participation/hostService.ts` (Host-composed integration, following `lib/
   encounterRealization/hostService.ts` precedent) for the realize -> consequence -> memory ->
   adaptation composition and the replay/multi-visitor proofs.
8. Create `packages/private-reflection-contracts/` and `-runtime/` (§12), with the
   dependency-boundary regex scan extended to include `spatial-ecology-runtime` and (once real)
   `canonical-event-runtime`.
9. Implement proofs A-F (observation, private reflection, valid/invalid action, stale
   rejection, retry) per §29 test matrix.
10. Implement proofs G-K (visitor absence/return, multi-visitor, conflicting actions) --
    depends on task 3's family migration for real `worldInstanceId` multi-instance testing.
11. Implement proof P (checkpoint/replay with a crash injected between wake-catch-up completing
    and participation-realization starting) -- exercises Sprint 17's fix directly, adapted to
    the participation layer.
12. Implement Vrindavan proof (§22) as a Host-layer test and Living Forest proof (§23) as an
    `encounter-realization-runtime` package test, matching existing naming precedent.

## 29. Targeted test matrix

Reuses Phase 0 §38's design (proofs A-R) without change to its content; the only update is
target family:

| Proof | Real test-file precedent to follow |
|---|---|
| A. Observation causes no mutation | trivial, no precedent needed |
| B. Private reflection causes no mutation | dependency-boundary regex scan pattern (new file) |
| C. Valid action -> consequence | `lib/encounterRealization/hostService.test.ts` |
| D. Invalid action -> zero mutation | same file, negative-path tests |
| E. Stale action rejected | `intentDispatcher`'s existing select-encounter re-resolution test, if one exists, else new |
| F. Retry does not duplicate | `hostService.test.ts` replay-test's "2 events not 4" assertion style |
| G/H. Absence/return, world advances | Sprint 9 dormancy/wake tests + Sprint 17's `lib/worldPersistence/crashRecoveryCatchUp.test.ts` pattern |
| I/J. Multi-visitor shared/independent state | `lib/livingSystems/orchestrator.test.ts:59-79` directly |
| K. Conflicting simultaneous actions | Sprint 9 `conditionalSave` conflict test pattern |
| L. Canon cannot be rewritten | `encounterRealizationResolution.test.ts` pattern (file confirmed to exist under this name in the encounter-realization-runtime package) |
| N. Web/Unreal parity | `alternateWorldEmbodiment.test.ts` pattern |
| O. worldInstanceId isolation | Sprint 16's own multi-instance test (`SPRINT16_FINAL_REPORT.md` §17) pattern |
| P. Checkpoint/replay w/ crash injection | `lib/spatialEcology/wakeChainCrashRecovery.test.ts` (confirmed real, added by the Sprint 17 fix commit) -- extend with a participation-realization step after the wake |
| Q. Living Forest | new fixture, same 4-fixture family (§23) |

## 30. Explicit STOP gates

1. **RESOLVED** (was Phase 0 STOP gate #1): Sprint 17's crash-recovery fix has landed
   (`40a3fc7`, 1514/1514 tests) -- no longer an open blocker for wake-chain-adjacent work.
2. **RESOLVED** (was Phase 0 STOP gate #2): Sprint 16's spatial hierarchy is real and
   implemented -- §6 above is no longer subject to reconciliation.
3. **OPEN, HARD BLOCKING** (new, §27 item 3): the world-model-family collision must be
   explicitly decided before any implementation task in §28 begins. This is more fundamental
   than either Phase 0 STOP gate -- it determines whether tasks 3-7 are correct as written.
4. **OPEN, HARD BLOCKING** (unchanged dependency shape, §26): Sprint 19 implementation must not
   begin until Sprint 18 closes and this document's §11/§26/§27-item-1 are re-verified against
   its real closing commit -- the outermost wake-function name Sprint 19 must NOT independently
   re-wrap is only knowable once Sprint 18 lands.
5. Phase 0's remaining open design questions (§41 items 3-5: whether to narrow
   `VisitorWorldMemoryRepository` to get-only by shape, whether `PrivateReflectionRepository`
   deserves its own package vs. living in `experience-registry`, whether
   `ParticipationPrecondition`'s closed union needs StudioK authoring-vocabulary confirmation)
   remain open and are not resolved by Sprint 16/17 landing -- carried forward unchanged,
   flagged for implementation-time review per Phase 0's own recommendation.

---

SPRINT 19 IMPLEMENTATION PREP READY -- WAITING FOR SPRINT 18 CLOSURE
