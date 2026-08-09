---
sprint: 20
phase: implementation-prep (PART A of 2)
title: Persistent Living World Runtime v1 / Production Readiness -- Part A (Reconciliation, Singleton Convergence, Lifecycle, Lease)
status: PART A COMPLETE -- PART B (steps 5-15 + final report) TO FOLLOW
base: feature/sprint19-implementation @ 6cba231, merged with feature/sprint20-phase0-runtime-v1 @ d83705d
---

# Sprint 20 Implementation Prep -- Part A

This reconciles `docs/SPRINT20_PHASE0_RUNTIME_V1_PRODUCTION_ARCHITECTURE.md`
(forked from Sprint 15 @ `17c4bb3`, predates Sprint 16-19's real
implementation entirely) against the REAL, landed Sprint 16-19 code at
this branch's base commit `6cba231`. Every claim below was read
directly from source in this worktree, not from any Phase 0 document's
own assumption.

Part A covers Phase 0's own §46 items relevant to steps 1-4 of the
Sprint 20 mission (reconciliation, singleton convergence, lifecycle,
lease). Part B (a separate, later agent) covers steps 5-15 and the
final report.

---

## Step 1 -- Phase 0 blocker/assumption reconciliation

| Phase 0 item | Section | Classification | Real finding |
|---|---|---|---|
| Sprint 16 (spatial ecology) | §43 "BLOCKER (external)" | **RESOLVED BY SPRINT 16** | `feature/sprint16-spatial-ecology @ 5d1c76d`, real, 1497/1497 tests. `wakeWorldWithSpatialEcology` is real. |
| Sprint 17 (long-horizon evolution) | §43 "BLOCKER (external)" | **RESOLVED BY SPRINT 17** | `feature/sprint17-implementation-prep @ 40a3fc7`, real, 1514/1514 tests. |
| Sprint 18 (canonical events) | §43 "BLOCKER (external)" | **RESOLVED BY SPRINT 18** | `feature/sprint18-implementation-prep @ b3f072d`, real, 1556/1556 tests. |
| Sprint 19 (visitor participation) | §43 "BLOCKER (external)" | **RESOLVED BY SPRINT 19** | `feature/sprint19-implementation @ 6cba231`, real, 1601/1601 tests. |
| `lastActiveAt` crash-recovery defect | §13, §45 debt #1, **BLOCKER** | **RESOLVED BY SPRINT 17** | Fixed via `catchUpCausalEnvironment`/`commitWakeCompletion` split + `resolveTicksToApply` (`lib/worldPersistence/hostService.ts`, `packages/world-persistence-runtime/src/wakeCatchUpPlanner.ts`) -- NOT via a new `EvolutionHorizon` field as Phase 0 §13 speculated. The real fix defers the ONE commit point to `wakeWorldWithSpatialEcology` (the real outermost composed function, confirmed unchanged through Sprint 18/19), never a separately-named horizon marker. Functionally equivalent outcome, different mechanism -- Phase 0's own §13 diagram (acquire lease -> ... -> bump horizon once -> release) is otherwise accurate in shape. |
| World lease never released; `acquire` conflicts on same-owner retry | §10, §45 debt #2, **BLOCKER** | **STILL OPEN, addressed in Part A (see Step 4)** | Confirmed by direct inspection AND fresh test evidence (this Part A's own reverted-experiment, see Step 4): `grep` for `.release(` across every `lib/*/hostService.ts` at `6cba231` returns zero matches outside test files, exactly as Sprint 19's own final report also found independently. Part A adds a new, additive `releasingWorldLeaseAfter` primitive (tested) but deliberately does NOT retrofit it into `wakeWorld`/`wakeWorldWithSpatialEcology`/`wakeWorldWithCanonicalEvents` -- see Step 4 for why, and why this is the RIGHT scope for Part A rather than a full close-out. |
| `WorldRuntimeManifest` / artifact pinning (§5) | §43 "Versioning (World Grammar) READY (mostly)" | **STILL OPEN** | Nothing in Sprint 16-19 added this record. Genuinely new-for-v1, Part B/facade scope. |
| Runtime/persistence/renderer version fields (§6) | §43 "NEEDS IMPLEMENTATION" | **STILL OPEN** | Nothing in Sprint 16-19 stores any of these three axes. Part B/facade scope. |
| Artifact approval gate at creation (§7 item 1) | §43 "NEEDS IMPLEMENTATION" | **STILL OPEN** | `createWorldInstance` (§3's proposed facade) does not exist yet at all -- Part B scope. |
| `queryHealth`/`queryProvenance` facade (§16/§17) | §43 "NEEDS IMPLEMENTATION" | **STILL OPEN** | Not built by any Sprint 16-19 work (out of their scope). Part B scope. |
| Migration production-environment guard / dry-run (§32) | §45 debt #3 | **STILL OPEN** | `run-platform-migrations.js` unchanged since Sprint 15; Sprint 16/18/19 each added a migration (033/034/035) under the same prepared-not-applied convention, no guard added. Part B to produce the reconciliation PLAN only (§32 explicitly forbids applying any of them). |
| `CanonicalEventProjectionScope` spatial-hierarchy dependency (Phase 0's own "Unresolved prerequisite-dependent items") | -- | **NO LONGER APPLICABLE** | Resolved for real by Sprint 18's own reconciliation against real Sprint 16 ids (`DomainId`/`SectorId`/`QuadrantId`/`PatchId`/`LocalPlaceId`) -- confirmed in `packages/canonical-event-contracts/src/scope.ts`. |
| `ParticipationPrecondition` StudioK vocabulary confirmation | STOP gate #5 | **STILL OPEN, NOT Sprint 20's to resolve** | Explicitly a StudioK/Canon governance sign-off, out of this repo's scope, correctly deferred by Sprint 19 itself. |
| `VisitorWorldMemory.save()` removal question | Phase 0 open question | **STILL OPEN** | Sprint 19's own final report (§21 item 3, restated) leaves this open; not touched by Sprint 20 Part A (out of scope creep). |
| Legacy `select-encounter` disconnected from persistence (§45 debt #11) | inherited from Sprint 14/15 | **RESOLVED BY SPRINT 19** | `lib/participation/hostService.ts#authorizeAndRecordParticipation` converges this exact path onto the durable family. Confirmed by reading the real diff. |
| Golden Runtime v1 scenario (§40), steps 5/11/12 | -- | **RESOLVED BY SPRINT 19/16-17/18 respectively, for the underlying mechanism** -- still requires Part B's facade to actually RUN end-to-end | Every mechanism the scenario names now exists in code; nothing yet composes them into one `wakeLivingWorld` call. Part B scope. |

**Nothing above is fixed twice.** Every BLOCKER Phase 0 named that Sprint 17-19 already resolved is left untouched by Part A. The one BLOCKER still genuinely open (lease/release) is addressed narrowly, per Step 4 below -- not by redesigning Sprint 9's lease primitive.

---

## Step 2 -- Singleton -> durable convergence

**This is a materially bigger finding than "two remaining call sites."** Direct inspection of the real routes, not assumption:

```
app/api/account/living-vrindavan/world-snapshot/route.ts       -> resolveLivingSystemsSnapshot (singleton)
app/api/account/living-vrindavan/embodiment-snapshot/route.ts  -> resolveWorldEmbodimentSnapshot (embodimentOrchestrator.ts) -> resolveLivingSystemsSnapshot x(1+N reachable locations) (singleton)
app/api/account/living-vrindavan/interact/route.ts              -> dispatchInteractionIntent -> select-encounter converges on the durable family (Sprint 19, DONE); enter/leave/visit-location/begin-reflection stay on WorldRuntime (a different, legitimate per-user-progress concern, not shared-world truth -- Sprint 19's own finding, reconfirmed)
```

**100% of the two production READ routes (`world-snapshot`, `embodiment-snapshot`) run exclusively on Sprint 7's ephemeral, process-lifetime `SharedWorldState` singleton (`lib/livingSystems/singleton.ts`) today.** The durable, `worldInstanceId`-scoped family (Sprint 9-19: `DurableWorldState`, checkpoints, all of population/memory/social/rhythms/encounter-realization/adaptation/spatial/canonical-event/participation state) has **never once** been reached by a real, signed-in user's request -- only by tests and two dev-only routes (`persistence/wake`, `persistence/wake-full`).

`lib/worldEmbodiment/embodimentOrchestrator.ts#resolveWorldEmbodimentSnapshot` confirmed, by direct read: calls `resolveLivingSystemsSnapshot` once for the current location and once more per reachable location (Sprint 19's own N+1 characterization, reconfirmed exactly), then `resolveWorldEmbodiment` (Sprint 8, renderer-neutral projection) over those singleton-sourced snapshots. It imports `WORLD_ID` from `lib/livingSystems/singleton.ts` directly.

**Why this is NOT safely migratable in Part A, and is correctly left STILL OPEN (per the mission's own explicit escape hatch for exactly this situation):**

1. **No production code path ever wakes the durable family.** If `world-snapshot`/`embodiment-snapshot` were switched today to read `getWorldSnapshot`/`getEmbodimentSnapshot` (the durable family's own lease-free reads, exactly what Sprint 19's `authorizeAndRecordParticipation` already uses), a real signed-in user would see whatever the durable instance's LAST wake left it at -- which, since nothing in production has ever called wake, is **tick 0, freshly seeded, forever**, since a pure read never advances anything (§25/§26 of Phase 0, confirmed correct: "reads never mutate"). This would be a regression from what users see today (a singleton that DOES advance, via `advanceLivingSystemsSimulation`/whatever drives it), not an improvement, unless a real production wake path is ALSO wired in the same change -- which itself requires Step 4's lease work to be safe under concurrent visitors, and is explicitly Part B/facade scope.
2. **The two world models are not data-equivalent.** The singleton's `SharedWorldState` and the durable family's `DurableWorldState` are independently-seeded, independently-advanced representations that happen to share the same Vrindavan grammar. There is no code today that reconciles or migrates one into the other. Sprint 19's own final report already named this exact gap for `VisitorWorldMemory` specifically (`projectVisitorWorldMemory` vs. `visitorWorldMemoryRepository`, "a real data-migration question, not just a code-wiring one") -- direct inspection in Part A confirms the SAME gap applies to the shared-world state itself, one level up, for both remaining routes.
3. **Forcing a switch without a decision would violate the mission's own "no competing world truths" instruction in the other direction**: silently swapping the read source without addressing (1) and (2) would produce a live product regression (a world that appears frozen at tick 0 to every real user), which is arguably worse than the current, at-least-internally-consistent singleton-only state.

**What Part A did NOT do, and why that is the correct call, not an omission:** did not flip either route's read source, and did not build a compatibility shim that owns its own state (explicitly forbidden by the mission) or one that silently masks (2)'s data gap.

**What Part A confirms IS safe and unblocked for Part B/whoever owns the actual cutover decision:**
- The mechanism to READ durable state is already proven and production-battle-tested by Sprint 19's `select-encounter` migration -- `getWorldSnapshot`/`getEmbodimentSnapshot` (`lib/worldPersistence/durableSnapshot.ts`) are lease-free, safe to call from any read route today, with zero risk to the single-writer invariant.
- The blocking decision is a PRODUCT one: does Runtime v1 launch mean (a) a hard cutover (existing singleton-based user-visible world state is abandoned/reset), (b) a parallel-run with an explicit backfill/reconciliation step, or (c) something else? This is squarely a "genuine data-migration policy decision" the mission explicitly permits leaving open, and it blocks BOTH remaining routes identically (they are the same root cause, not two separate migrations).

**Recommendation for whoever makes this call (Part B, or a human sign-off before Part B)**: treat `world-snapshot` + `embodiment-snapshot` as ONE decision, not two -- migrating one without the other would leave the two production routes reading two different world models simultaneously (a worse "competing truths" state than today's consistent-if-outdated singleton-only reality).

---

## Step 3 -- World lifecycle

Verified against real code, `create -> acquire -> wake -> catch-up -> evolution -> participation/event processing -> checkpoint -> sleep -> release -> reacquire -> recovery`:

| Stage | Real code path | Status |
|---|---|---|
| Create/provision | `ensureWorldInstance` (`lib/worldPersistence/durableState.ts`, via `worldInstanceRepository`) | LANDED, implicit (first `getWorldState`/wake call seeds it) -- no explicit `createWorldInstance(worldDefinitionId, artifactId, ...)` facade exists yet (Phase 0 §30, genuinely new for v1, Part B scope) |
| Acquire | `worldLeaseRepository.acquire` inside `catchUpCausalEnvironment` | LANDED (Sprint 9) |
| Wake / catch-up | `catchUpCausalEnvironment` + every `wakeWorldWith*` layer through `wakeWorldWithCanonicalEvents` (Sprint 9-18) | LANDED, real, tested at every layer |
| Runtime evolution | population/memory/social/rhythms/encounter-realization/adaptation/spatial (Sprint 10-16), all composed inside the wake chain above | LANDED |
| Participation/event processing | `lib/participation/hostService.ts#authorizeAndRecordParticipation` (Sprint 19), `lib/canonicalEvents/hostService.ts` (Sprint 18) | LANDED, but NOT wake-triggered by design (Sprint 19's own finding: participation is dispatch-triggered, lease-free, precisely BECAUSE the lease has no same-owner reentrancy -- see Step 4) |
| Checkpoint | `worldCheckpointRepository.save`/`createCheckpoint`, called from `catchUpCausalEnvironment` whenever `ticksElapsed > 0` | LANDED (Sprint 9) |
| Sleep (quiesce) | `nextLifecycleState`'s `ACTIVE -> QUIESCING` transition (`packages/world-persistence-runtime`) | LANDED as a STATE TRANSITION, but **no production code path ever triggers it** -- confirmed by grep: `"quiesce"`/`"no-activity deadline"` exist only in the lifecycle state machine's own transition table and its own test, never called from any `lib/*/hostService.ts` on a real schedule. This matches Phase 0 §34's own recommendation ("no scheduler needed for v1") -- the state exists, the trigger does not, and per §34 correctly should not for v1. |
| Release | `worldLeaseRepository.release` | LANDED as a REPOSITORY METHOD (Sprint 9, tested directly in `leaseRepository.test.ts`); **never called from any Host code path** -- see Step 4. |
| Reacquire | same `acquire`, TTL-based | LANDED (Sprint 9) |
| Recovery | `crash_detected -> WAKING` transition (`nextLifecycleState`, Sprint 9) + `resolveTicksToApply`'s crash-safe formula (Sprint 17) | LANDED, tested (`crashRecoveryCatchUp.test.ts`, `wakeChainCrashRecovery.test.ts`) |

**No lifecycle stage was fabricated.** The one real, load-bearing gap (release never called in production) is Step 4's subject, not invented here as a new stage -- it is stage "Release," already named above, already landed as a primitive, just never invoked outside tests.

---

## Step 4 -- Lease semantics: decision and what Part A actually did

**Decision: a hybrid, not a pure (A) or (B).** The existing non-reentrant CONFLICT behavior for genuinely concurrent same-owner calls is CORRECT and must be preserved (§11's single-writer invariant depends on it -- Sprint 19 independently reached the identical conclusion and designed participation to avoid ever calling wake for exactly this reason). But "no Host code path ever releases a lease" is a real, separate defect, not part of that same correctness argument, and Phase 0's own §45 debt register agrees it is a BLOCKER.

**What Part A built:** `releasingWorldLeaseAfter(worldInstanceId, ownerId, fn)` (`lib/worldPersistence/hostService.ts`) -- a new, additive, exported primitive that runs `fn`, then in a `finally` block checks whether the CURRENT lease (re-read fresh) is still held by `ownerId`, and releases it if so. It does not retry `acquire` on a same-owner conflict (preserving the correct rejection behavior above), and it never touches a lease actually held by a different owner (verified by test).

**What Part A explicitly did NOT do, and why:** an earlier version of this fix wrapped `wakeWorld`, `wakeWorldWithSpatialEcology`, and `wakeWorldWithCanonicalEvents` directly with this primitive. Running the full test suite caught a REAL regression before it was committed: `lib/worldPersistence/hostService.test.ts`'s own "the lease holder can explicitly advance the world further after waking it" (and two dependent tests) rely on `wakeWorld` in one call leaving the lease HELD so a LATER, SEPARATE call to `advanceWorld` (via the separate `persistence/advance` dev route, in real usage) can use it -- this is an intentional, tested, existing multi-request workflow, not an accident. Auto-releasing inside `wakeWorld` itself broke it (`npm test`: 3 failures, `LeaseConflictError`/`TypeError` on a null lease). This was reverted before commit. **Releasing is a session-boundary decision only the caller composing a chain gets to make** -- a shared primitive underneath existing composed functions must not impose one. This is exactly the kind of "smallest safe correction" the mission asked for: fix the verified defect (nothing testable exists to prove release ever happens) without touching any existing Sprint 9-19 function's observable behavior.

**Who should use this primitive:** the Sprint 20 v1 facade (`wakeLivingWorld`, Phase 0 §3, not yet built -- Part B scope). That facade is the correct place to define "one request/session = one acquire-and-release" for a real per-visitor production wake, closing the production gap (§10/§45 debt #2) at exactly the layer that should own it.

**Tests written** (`lib/worldPersistence/releasingWorldLeaseAfter.test.ts`, 8 new, all passing):
- competing owner: a genuinely-still-held lease correctly rejects a second acquirer (unchanged behavior, reconfirmed)
- release after success
- release after the wrapped function throws
- no-op when nothing was ever acquired
- never releases a different owner's real lease (and that owner's own attempt is still correctly rejected)
- same-owner reacquire immediately after release (no TTL wait)
- different-owner reacquire immediately after release
- multi-world isolation: releasing world A's lease never touches world B's lease held by the same owner

**Full regression**: 1609/1609 passing (1601 baseline + 8 new), `tsc --noEmit` clean, `eslint` clean on every touched file. RC3 and every Sprint 16/17/18/19 worktree/branch confirmed untouched (`git status --short` clean in each, checked directly).

---

## Handoff to Part B

Part B should build, in this same worktree/branch:
1. The `wakeLivingWorld`/`createWorldInstance`/`getWorldSnapshot`/`getWorldDelta`/`submitVisitorIntent`/`queryHealth`/`queryProvenance` v1 facade (Phase 0 §3), using `releasingWorldLeaseAfter` as `wakeLivingWorld`'s own session boundary.
2. Steps 5-15 of the mission (crash recovery proofs, deterministic replay, multi-world concurrency, Canon+visitor coexistence, long-horizon production proof, renderer-neutral boundary, snapshot/checkpoint/restore, observability, failure containment, portability proof, full acceptance matrix A-N).
3. The world-snapshot/embodiment-snapshot convergence decision from Step 2 above remains explicitly open -- Part B should either secure/simulate an explicit product decision and execute it, or carry it forward as a named, still-open item in the final report (item N of the acceptance matrix, "remaining singleton production paths eliminated or explicitly proven safe," should be answered honestly either way, not silently marked done).
4. Final regression/typecheck/lint pass and `docs/SPRINT20_FINAL_REPORT.md`.
