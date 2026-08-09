---
sprint: 17
purpose: implementation preparation / reconciliation (not architecture)
status: READY FOR IMPLEMENTATION ONCE SPRINT 16 CLOSES
base: feature/sprint15-world-adaptation @ 17c4bb3
inputs:
  - Sprint 17 Phase 0 (feature/sprint17-phase0-long-horizon-evolution @ 8018899)
  - Sprint 16 implementation, READ-ONLY (feature/sprint16-spatial-ecology @ 5d1c76d — CLOSED
    during this session's research; 1497/1497 tests, docs/SPRINT16_FINAL_REPORT.md exists;
    see §1 note)
---

# Sprint 17 Implementation Prep

This is a handoff, not a design essay. Every claim below was re-verified against actual code
at the Sprint 15 tip (`17c4bb3`) and the current, in-progress Sprint 16 worktree
(read-only). Where Phase 0's claims held, they're restated tersely with file:line. Where
reconciliation changed the picture, that's called out explicitly.

---

## 1. Sprint 16 Seam — CLOSED mid-session (`feature/sprint16-spatial-ecology` @ `5d1c76d`)

**Status update**: Sprint 16 was still in progress (uncommitted) at the start of this
session's research; it closed and pushed while this document was being written. Re-verified
directly against the pushed commit: 1497/1497 tests passing (1451 pre-existing + 46 new),
`docs/SPRINT16_FINAL_REPORT.md` exists, "no RC3 changes, no Sprint 7-15 package modified, no
migration executed." Everything below reflects the closed, pushed state — not the earlier
in-progress read.

Package family: `spatial-ecology-contracts` / `spatial-ecology-runtime` + `lib/spatialEcology/`.
Hierarchy: `Domain → Sector → Quadrant → Patch → LocalPlace` over existing `LocationId`.

**Stable enough to build against:**
- `PatchState` — derived read-time projection, **no repository**, same posture as Sprint 13's
  `PlaceOccupancy`. `resolvePatchState(params)` composes existing Sprint 7/13/15 outputs
  (environment, resource opportunities, place occupancy, adaptation effects). No new causal
  engine.
- `SpatialEdge`/topology — plain BFS over `traversable` edges (`reachablePatchIds`), `Route` as
  an authored ordered-edge claim on top.
- `TerritoryClaim` — the **one** new persisted type (`TerritoryClaimRepository.append`,
  idempotent by `territory-claim:{homeRangeId}:{patchId}`). Explicitly a read-only
  aggregation over Sprint 12's `HomeRange` — not a second preference list.
- `SpatialSnapshot`/`SpatialDelta` — same renderer-neutral diff pattern as Sprint 8's
  `diffWorldEmbodiment`.
- `wakeWorldWithSpatialEcology(worldInstanceId, ownerId, now)` in `lib/spatialEcology/
  hostService.ts` — calls `wakeWorldWithAdaptation` internally, then derives+persists
  `TerritoryClaim`s, then returns a spatial snapshot. **Contracts/resolvers/hostService
  function all look internally finished and tested** — zero TODO/stub markers found.

**Confirmed at closure — deliberate, not incomplete work (re-verified against `5d1c76d`):**
- `wakeWorldWithSpatialEcology` is still not called from any app route or higher orchestrator.
  Sprint 16's own final commit composes `wakeWorldWithAdaptation` (Sprint 15's outermost)
  unmodified and stops at Host-level tests — "7 Host-level tests proving the full wake
  composition... no RC3 changes." This is Sprint 16 correctly staying in its lane, not a gap
  it left behind — **app-route wiring is explicitly Sprint 17's job** (§10 task 4).
- Migration `033_spatial_ecology.sql` (one table, `territory_claims`) is "prepared and
  registered, not applied — matching migrations 026-032's own precedent." Still only an
  in-memory `TerritoryClaimRepository`. This is the established repo convention for this
  codebase, not a Sprint 16 shortfall — Sprint 17 does not need to apply it either, unless
  Sprint 17 implementation specifically needs durable territory claims across a real crash
  (recommend deferring to whichever sprint first needs a real Postgres-backed spatial
  repository, per the same precedent).

**Sprint 17 action**: `wakeWorldWithSpatialEcology` is now a **closed, stable, real outermost
wake layer** — implement the crash-recovery fix (§4) directly against it, not against the
interim `wakeWorldWithAdaptation` target originally planned before closure. No Sprint 16 gate
remains open for §4's fix itself.

---

## 2. Sprint 15 Reconciliation (final, committed — `17c4bb3`)

```
EncounterRecord (Sprint 14, REALIZED)
        │
        ▼
deriveAdaptationSignals(RealizedEncounterSignalInput[])   -- packages/world-adaptation-runtime/
        │                                                    src/adaptationSignals.ts:45
        ▼
AdaptationSignal { domain, subjectId, kind, tick, weight, causalReferences }
        │
        ▼
AdaptationPressure (decays via lastUpdatedTick) → AdaptationDecision (tier = floor(pressure/threshold))
        │
        ▼
AdaptationEffect  -- closed union: ENTITY | RELATIONSHIP | PLACE | GROUP | WORLD_POSSIBILITY
        │
        ▼
applyAdaptationEffect (lib/worldAdaptation/hostService.ts:70) → for RELATIONSHIP/
INTERACTION_LIKELIHOOD_BIAS, calls applyEncounterEvidence (lib/socialEcology/hostService.ts:341,
UNCHANGED since Sprint 14) → raises RelationshipState.band
        │
        ▼
Next wake: lib/encounterRealization/hostService.ts:105-116 reads relationshipBand and passes
it into resolveEncounterRealization -- the resolver itself is UNTOUCHED since Sprint 14
```

`deriveAdaptationEffectId(worldId, ruleId, subjectId, tier)` (`adaptationIdentity.ts:17`) is a
documented restatement of `deriveEncounterRecordId`/`deriveMemoryRecordId` — same sha256
pattern, keyed on `tier` not `tick` so re-crossing the same tier is idempotent.
`wakeWorldWithAdaptation` (`lib/worldAdaptation/hostService.ts:149`) chains after
`wakeWorldWithEncounterRealization` — **no alternate adaptation concept is introduced or
needed.**

---

## 3. Exact Wake-Chain Composition (reconfirmed post-Sprint-15, plus Sprint 16 addition)

```
wakeWorldWithSpatialEcology        lib/spatialEcology/hostService.ts        [Sprint 16, CLOSED @ 5d1c76d -- TODAY'S outermost]
        │ calls
wakeWorldWithAdaptation            lib/worldAdaptation/hostService.ts:150   [Sprint 15]
        │ calls
wakeWorldWithEncounterRealization  lib/encounterRealization/hostService.ts:70
        │ calls
wakeWorldWithRhythms               lib/livingRhythms/hostService.ts:52
        │ calls
wakeWorldWithSocialEcology         lib/socialEcology/hostService.ts:101
        │ calls
wakeWorldWithMemory                lib/worldMemory/hostService.ts:85
        │ calls
wakeWorldWithPopulation            lib/livingPopulation/hostService.ts:138
        │ calls
wakeWorld                          lib/worldPersistence/hostService.ts:43   [Sprint 9 -- innermost]
```

**Critical finding, not previously documented**: grep across `app/api/**` for any
`wakeWorldWith*` call returns **nothing**. The only real route,
`app/api/dev/account/living-vrindavan/persistence/wake/route.ts:24`, calls the **bare**
`wakeWorld()` directly — it never traverses population/memory/socialEcology/rhythms/
encounterRealization/adaptation/spatialEcology at all. **The entire composed chain is
currently exercised only by each layer's own test suite, never by product code.** This is a
Sprint 17 task in its own right (§10, task 4), not just a crash-recovery detail.

---

## 4. Crash-Recovery Defect — Confirmed From Live Code

`lib/worldPersistence/hostService.ts:107-110`, inside `wakeWorld()`:
```ts
const active = nextLifecycleState(waking ?? currentState, "catch_up_complete") ?? "ACTIVE"
await worldLifecycleRepository.save({ worldInstanceId, state: active, lastActiveAt: now(), ... })
return { lifecycleState: active, state: finalState, ticksApplied: ticksElapsed, ... }
```
This is the **only** place `lastActiveAt` is written, and it commits **before** `wakeWorld`
returns to its caller — i.e. before any of the six downstream layers (population, memory,
social ecology, rhythms, encounter realization, adaptation, and now spatial ecology) has
persisted anything. Every downstream layer's own persistence
(`lib/livingPopulation/hostService.ts:136-141` and the identical shape repeated up the chain)
happens strictly after `wakeWorld()` has already returned and already committed. **Confirmed
real and unfixed as of Sprint 15's final commit; Sprint 15 extended the exposure (one more
layer) rather than narrowing it.**

`WorldLifecycleRecord` (`packages/world-persistence-contracts/src/lifecycle.ts:25-30`) has
exactly 4 fields — `worldInstanceId, state, lastActiveAt, lastCheckpointTick` — no per-layer
progress marker exists. `WorldCheckpoint` (`checkpoint.ts:21-32`) captures only
`sharedState`+`entities` (the causal-environment layer) — none of population/memory/social/
rhythms/encounters/adaptation/spatial state. `computeDeterministicCatchUp`/
`recoverAuthoritativeState` remain scoped exactly to that same layer, unchanged through
Sprint 15.

### Fix strategy (smallest safe change, existing primitives only)

**Reconciliation finding: no new `WorldLifecycleRecord` field is required for the minimal
fix** — only relocating the *existing* `lastActiveAt` write to the true end of the chain.
Phase 0 mused about a dedicated "last fully-evolved tick" marker; on reconciliation, the field
itself is unnecessary if sequencing is corrected. Keep it as a documented Phase 2 hardening
option only.

1. **Split `wakeWorld()`**: extract everything it does today *except* the final
   `worldLifecycleRepository.save(...lastActiveAt: now()...)` write into a
   `catchUpCausalEnvironment()` primitive. Keep `wakeWorld()` itself as a thin
   backward-compatible wrapper (still eager-commits) for the one existing caller that only
   wants environment-level wake (the dev route, §1's finding) — do not break it.
2. **Compute `ticksElapsed` exactly once per composed wake attempt**, from the *unmoved*
   `lastActiveAt`, at the top of the new outermost composed entry point. Thread that same
   number, unchanged, through every downstream layer for this attempt.
3. **Handle the environment `conditionalSave` conflict case explicitly**: if a prior partial
   attempt already advanced the environment's durable state (conflict on retry), do **not**
   recompute `ticksElapsed` from the now-advanced environment tick — keep using the value
   computed from the still-unmoved `lastActiveAt` and pass it to every downstream layer
   regardless, so they get the catch-up window they may have missed on the crashed attempt.
4. **Downstream idempotency is already sufficient, verify don't invent**: memory/relationship/
   encounter/adaptation/territory writes are content-hash append-idempotent (existing
   pattern, §2); population/behavior state writes are deterministic recompute-and-overwrite
   from a freshly-read `stateBeforeWake` each call — safe to redo as long as `stateBeforeWake`
   is re-read fresh on every retry (already true, `lib/livingPopulation/hostService.ts:137`
   reads it at the top of the function). **Task 7 (§10) must specifically audit this
   assumption** rather than take it on faith.
5. **Commit `lastActiveAt` exactly once, last**: `wakeWorldWithSpatialEcology`
   (`lib/spatialEcology/hostService.ts`) is now the real, closed outermost composed function
   — it calls a small new `commitWakeCompletion(worldInstanceId, tick, now)` only after every
   downstream persistence call in the chain (including its own `TerritoryClaim`
   derivation/append) has returned successfully. No interim target or later relocation is
   needed.
6. **Concurrency — unconfirmed, verify at implementation start**: it is not yet established
   from reading the code whether `wakeWorld()`'s lease is held for the caller's full downstream
   chain or released internally before returning. If released early, a second visitor could
   acquire a fresh lease and trigger a concurrent second composed wake while the first
   caller's downstream layers are still persisting — a genuine double-application risk
   distinct from the crash-recovery defect. **The composed outermost function must acquire the
   lease once and hold it for the entire chain + final commit, releasing only after.** Treat
   this as a required verification/fix, not an assumption either way.

This closes: elapsed interval is no longer consumed before durable success (step 5); crash/
retry cannot lose elapsed ticks (steps 2-3); downstream consequences are not duplicated (step
4, content-hash/deterministic-overwrite); season transitions are not doubled (§7 — already
per-tick, unaffected by this fix); visitor-triggered consequences are not sequenced through an
unsafe partial wake (step 6, once the lease-hold question is resolved).

---

## 5. Evolution Window Matrix

| System | Owner | Current advance mechanism | Sprint 17 role | Can aggregate? | Replay requirement |
|---|---|---|---|---|---|
| WorldClock / causal environment | Sprint 9 (`living-systems-runtime`) | Pure per-tick loop, `advanceWorldSimulation` | Reuse unchanged; relocate only the `lastActiveAt` commit point (§4) | Yes — already ticks internally per elapsed count | `computeDeterministicCatchUp` already pure/deterministic |
| Hydrology / ecology | Sprint 7 | Function of weather history, computed per tick inside the same loop | No change | Yes (bundled with environment) | Same as above |
| Population / behavior | Sprint 10 | `advancePopulationForWorld(..., ticksApplied, ...)`, deterministic overwrite | Consume the corrected, never-collapsing `ticksElapsed` (§4 step 2-3) | Yes, already single-shot per wake | Verify overwrite-safety under redo (task 7) |
| World / entity memory | Sprint 11 | Derived from `WorldEvent`s, append-idempotent | No change | Yes | Content-hash append, already replay-safe |
| Social ecology | Sprint 12 | `applyEncounterEvidence` sole write boundary | No change | Yes | Same sole-writer discipline holds |
| Living rhythms / place occupancy | Sprint 13 | Fully derived, no repository at all | No change | Trivially yes (nothing to redo) | N/A — recomputed fresh every time |
| Encounter realization | Sprint 14 | `resolveEncounterRealization`, content-hash `EncounterRecord` id | No change | Yes | Pre-check-then-work, already replay-safe |
| Adaptation | Sprint 15 | `deriveAdaptationSignals`/pressure/decision/effect, content-hash effect id keyed on tier | No change | Yes | Append-idempotent by `(ruleId, subjectId, tier)` |
| Spatial ecology | Sprint 16 (closed @ 5d1c76d) | `resolvePatchState` fully derived; `TerritoryClaim` append-idempotent | Consume corrected `ticksElapsed` directly as the real outermost layer | Yes | Same append-idempotent pattern as territory claim id |

**No system requires a second simulation engine or a new "aggregated window" abstraction
beyond what already exists** — every layer already either derives fresh or writes
idempotently. The only genuinely new contract is a thin `EvolutionWindow`/`WakeCatchUpPlan`
shape (task 2, §10) that just carries `{ fromTick, toTick, seasonCrossings }` for logging/test
assertions — not a new causal mechanism.

---

## 6. Spatial Long-Horizon Seam (read-only against Sprint 16)

```
elapsed time (unchanged ticksElapsed, §4)
        → environment/hydrology/ecology advance (Sprint 7/9, unchanged)
        → resourceOpportunity re-resolved (Sprint 13, unchanged, feeds PatchState)
        → PatchState.resolvePatchState() re-derived fresh at the new tick (Sprint 16, no
          catch-up needed -- it's always a projection over already-caught-up inputs)
        → TerritoryClaim re-derived from current HomeRange, appended idempotently (Sprint 16)
        → route/reachability re-evaluated fresh (Sprint 16, no persisted state to catch up)
        → occupancy rollup fresh (Sprint 16, mirrors Sprint 13's PlaceOccupancy posture)
        → encounters / adaptation as already described (§2, §5)
```

**Exact integration point, now closed and stable**: `wakeWorldWithSpatialEcology` already
calls `wakeWorldWithAdaptation` internally and already derives+persists `TerritoryClaim`s
afterward — the composition Sprint 17 needs is already written and closed (§1). Remaining
work is entirely Sprint 17's: (a) implement the crash-recovery fix's final commit point
directly inside `wakeWorldWithSpatialEcology` (§4 step 5, no relocation needed — it's already
the right target), (b) wire it into a real app route (§10 task 4). Applying migration 033 and
swapping in a real `TerritoryClaimRepository` remains optional/deferred, per the repo's own
established convention (§1) — not a blocker for Sprint 17's crash-recovery or wake-chain work.

---

## 7. Season Crossing

`SeasonDefinition`/`SeasonState` (`packages/living-systems-contracts/src/season.ts:18-38`):
data-driven `order`/`allowedNextSeasonIds`, not a hardcoded fixed pair. `resolveSeasonTransition`
(`living-systems-runtime/src/seasonTransition.ts:17-26`) advances once
`tick - enteredAtTick >= minDurationTicks`, deterministically to `allowedNextSeasonIds[0]`
(first-allowed only — a real multi-choice rule is explicitly out of scope, unchanged).

**Already correct by construction for multi-crossing catch-up**: `advanceWorldSimulation`
(`simulation.ts:35-55`) loops one tick at a time and calls `resolveSeasonTransition` fresh on
*every* tick — a large `ticksElapsed` naturally cascades through as many season boundaries as
it crosses, one at a time, with no explicit "if elapsed spans season" special case needed. This
is **not proven by an existing test**, though — no test exercises 2+ transitions in one
catch-up call.

**Sprint 17 plan**:
- Short absence within same season: no special handling, existing behavior.
- Vasanta → Grīṣma crossing: existing single-transition test coverage already exists; add one
  Sprint-17-owned integration test asserting a catch-up spanning the crossing produces the
  identical end state as stepping tick-by-tick (regression-proves the loop's correctness
  explicitly rather than trusting it implicitly).
- Multiple future authored crossings: Living Vrindavan today authors only 2 seasons, so a
  genuine 2-crossing-in-one-catch-up test **cannot use real Vrindavan data** without
  authoring new Canon (explicitly prohibited). Use the existing `otherWorldGrammar.test.ts`
  synthetic fixture pattern (already used for exactly this kind of world-neutral proof) with a
  3-season synthetic definition instead — no new Vrindavan Canon required.

---

## 8. Persistence / Checkpoint Plan

```
wake start           -- lease acquire (verify hold duration, §4 step 6)
        │
evolution window      -- ticksElapsed computed ONCE (§4 step 2), pure derivation per layer,
        │                no writes yet except environment's own conditionalSave (CAS-protected)
        │
window completion     -- each downstream layer persists via its EXISTING idempotent mechanism
        │                (append-by-content-hash or deterministic overwrite) -- no new
        │                mechanism, no expansion of WorldCheckpoint's stored scope required
        │
checkpoint            -- existing Sprint 9 periodic-checkpoint logic, UNCHANGED scope
        │                (causal-environment layer only -- downstream layers don't need
        │                checkpoint replay because they're independently idempotent/derived)
        │
lastActiveAt commit    -- moved to here, LAST, after every layer above succeeded (§4 step 5)
        │
wake completion        -- lease release
```

Idempotent retry, crash recovery, and single-application of consequences are all achieved by
**composing existing Sprint 9/11/14/15 primitives correctly** — `conditionalSave`'s
`expectedVersion` CAS, content-hash append-idempotency, and deterministic pure recomputation.
No new database guarantee (e.g. cross-table transactions spanning multiple Supabase
tables/schemas) is invented or assumed; none currently exists in this codebase and Sprint 17
does not require one, because each individual write is already independently safe to redo.

---

## 9. Concurrency Plan

Existing primitive is sufficient: `WorldLeaseRepository.acquire` returns
`{status:"conflict", heldBy}` (never throws internally; `wakeWorld()` converts conflict to a
thrown `LeaseConflictError` for its caller — `lib/worldPersistence/hostService.ts:46-49`,
test-confirmed at `hostService.test.ts:46-48`). This is sufficient for two visitors racing to
wake the same dormant world **provided §4 step 6's open question is resolved**: the lease must
be acquired once by the composed outermost function and held for the full chain + final
commit, not just for `wakeWorld()`'s own inner slice. No new concurrency primitive (in-process
guard, additional CAS layer) is needed beyond this — do not implement one speculatively. This
plan does not depend on Sprint 20 or any other not-yet-closed sprint.

---

## 10. Implementation Task List

1. **Crash-recovery fix** — split `wakeWorld()`, relocate `lastActiveAt` commit to the
   outermost composed layer, resolve the lease-hold-duration question (§4).
2. **Evolution-window contracts** — thin `EvolutionWindow`/`WakeCatchUpPlan` type
   (`{fromTick, toTick, seasonCrossings}`) for logging/test assertions only, in
   `world-persistence-contracts` or a small new file alongside it — not a new package.
3. **Deterministic catch-up planner** — the "compute `ticksElapsed` once, thread unchanged"
   logic (§4 steps 2-3) as an explicit, testable function.
4. **Wake-chain integration** — wire the composed chain into a real app route (replacing or
   supplementing the bare-`wakeWorld()`-only dev route, §3's finding); this is necessary
   regardless of the crash-recovery fix, since the chain is currently dead code in production.
5. **Season-boundary handling** — add the missing multi-crossing regression test (§7), using
   a synthetic fixture, not new Vrindavan Canon.
6. **Spatial propagation integration** — Sprint 16 is closed: implement the crash-recovery
   fix's final commit directly inside `wakeWorldWithSpatialEcology` (already the real
   outermost layer, no relocation needed), and re-run the crash-recovery proofs against the
   full, now-includes-spatial chain. DB-backed `TerritoryClaimRepository`/migration 033
   remain optional-deferred per repo convention (§1) — do not block on them.
7. **Checkpoint/replay/idempotency audit** — specifically verify population/behavior state's
   overwrite-based persistence is genuinely safe to redo (§4 step 4's assumption), not just
   assumed from pattern-matching against the append-based layers.
8. **Multi-visitor wake consistency** — test two simultaneous wake attempts on one
   `worldInstanceId`; assert one succeeds, one gets `LeaseConflictError`, zero double-applied
   ticks/consequences.
9. **Alternate-world (Living Forest) proof** — extend the existing 4-fixture Living Forest
   family with a 5th exercising the full, crash-recovery-fixed composed chain, proving the fix
   is world-neutral.
10. **Targeted tests** — implement the test matrix (§11) items A-L.
11. **Final regression pass** — re-run Sprint 7-16 existing suites; specifically confirm the
    dev route's bare-`wakeWorld()` backward-compatible path (§4 step 1) still behaves
    identically for its existing callers.
12. **Final report / commit / push** — `docs/SPRINT17_FINAL_REPORT.md`, commit, push, no
    merge.

---

## 11. Test Plan

| # | Scenario | Level | Extends |
|---|---|---|---|
| A | Short absence, same season | Unit | `catchUp.test.ts` pattern |
| B | Multi-day absence | Unit | same |
| C | Vasanta→Grīṣma crossing | Integration | existing `seasonTransition.test.ts`, extended to full catch-up |
| D | Crash mid-wake + retry | Integration | new — the core proof for §4's fix |
| E | Same wake retried twice (no crash) | Integration | `hostService.test.ts` replay-count-assertion pattern |
| F | Simultaneous wake attempts | Integration | `hostService.test.ts:46-48` lease-conflict pattern |
| G | Two `worldInstanceId`s | Integration | `multiInstance.test.ts` pattern |
| H | Spatial patch/resource change after absence | Integration | PENDING SPRINT 16 CLOSURE |
| I | Encounter/consequence evolution while visitor absent | Integration | existing Sprint 14 hostService tests, extended across the fixed chain |
| J | Protected Canon unchanged | Unit / repository-level | existing `dependencyBoundaries.test.ts` regex-scan pattern |
| K | Deterministic checkpoint/replay | Repository-level | `recoverAuthoritativeState` pattern |
| L | Alternate Living Forest fixture | Integration | task 9, new 5th fixture |

No Playwright/live-browser test is required for this sprint — everything here is Host-service
and repository-level, matching how Sprints 9-15 were tested.

---

## 12. Dependency Gates

**Sprint 16 closed during this session** (`5d1c76d`, §1) — the gate this section originally
existed to track is cleared. Nearly everything is now **READY NOW**:

**READY NOW** (verified against the closed Sprint 16 tip, `5d1c76d`):
- Crash-recovery fix (§4), implemented directly against the real outermost layer,
  `wakeWorldWithSpatialEcology` — no interim target, no relocation step needed.
- Wake-chain integration into a real app route (task 4) — the full six-plus-one-layer chain,
  including spatial ecology, is closed and stable to wire up.
- Season-boundary regression test (task 5).
- Multi-visitor concurrency test (task 8).
- Living Forest 5th fixture (task 9) — Sprint 16 already ships its own Living Forest
  portability proof (F01, 4 Quadrants, 16 Patches), so the pattern to extend is already
  present, not hypothetical.
- Full test matrix including item H (spatial patch/resource change after absence) — now
  buildable against real, closed `PatchState`/`resolvePatchState`.

**Deferred by established repo convention, not blocking Sprint 17**:
- DB-backed `TerritoryClaimRepository` + applying migration `033_spatial_ecology.sql` —
  Sprint 16 deliberately left these unapplied, matching migrations 026-032's own precedent.
  Sprint 17 should follow the same convention rather than being the sprint that breaks it;
  revisit only if a specific Sprint 17 requirement (e.g. a durability proof for territory
  claims across a real crash) demands it.

No Sprint 16 API is fabricated anywhere above — every spatial-ecology reference in this
document cites a type/function verified against the closed, pushed `5d1c76d` commit.

---

SPRINT 17 IMPLEMENTATION PREP READY — WAITING ONLY FOR SPRINT 16 CLOSURE
