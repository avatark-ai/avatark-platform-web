# Sprint 17 Final Report — Long-Horizon World Evolution

## 1. Repo / branch / commit

- Repo: `avatark-platform-web`
- Base: `feature/sprint16-spatial-ecology` @ `5d1c76d` (completed, authoritative Sprint 16 runtime — 1497/1497 tests passing, typecheck clean, lint clean, RC3 untouched, migration prepared-not-applied, per Sprint 16's own final report)
- Implementation branch: `feature/sprint17-implementation-prep`, isolated worktree, no other Sprint 16/17/18/19/20 worktree touched
- Phase 0 design input (read-only): `feature/sprint17-phase0-long-horizon-evolution` @ `8018899`
- Reconciliation/prep input (this branch's own prior commit, read and preserved): `docs/SPRINT17_IMPLEMENTATION_PREP.md` @ `7cdb287` — written against a base that predated Sprint 16's closure; this branch was rebased onto `5d1c76d` before any implementation code was written, so every Sprint 16 API referenced in that document (and in this implementation) is verified against the real, closed, pushed spatial-ecology code, never Phase 0's earlier hypothetical interface.

## 2. Sprint 16 reconciliation result

The prep document (§1) had already re-verified Sprint 16's real shape mid-session; this implementation re-confirmed it once more after the rebase and found nothing had drifted:

- `wakeWorldWithSpatialEcology` (`lib/spatialEcology/hostService.ts`) is the real, closed, tested outermost composed wake function — Sprint 9's causal environment through Sprint 16's spatial ecology, all in one call.
- It was, before this sprint, dead code in production: `grep` across `app/api/**` for any `wakeWorldWith*` call returned nothing. The only real route, `/persistence/wake`, calls the bare, environment-only `wakeWorld()` directly.
- Migration `033_spatial_ecology.sql` remains prepared-registered-not-applied, matching migrations 026–032's own precedent; this sprint does not apply it or any other migration.

## 3. The crash-recovery defect — confirmed, then fixed

Confirmed by direct code inspection *and* an empirical, throwaway reproduction script before any fix was written: `lib/worldPersistence/hostService.ts`'s pre-Sprint-17 `wakeWorld()` committed `lastActiveAt`/`lastCheckpointTick` (the ONLY durable record of "how far the world has been fully caught up") immediately after the causal environment's own catch-up succeeded — **before** any of the six downstream layers (population, memory, social ecology, rhythms, encounter realization, adaptation) or Sprint 16's own spatial/territory work had persisted anything. A crash between that commit and any downstream layer's own persistence would permanently and silently lose that layer's catch-up window: `lastActiveAt` would already read as "caught up," so a later wake would compute zero owed ticks for it.

The straightforward fix — just move the commit to the end of the composed chain — was verified, by the same reproduction methodology, to introduce a **second, opposite** defect: a retry after a crash between the environment's own successful catch-up and the (now-deferred) final commit would recompute the *full* wall-clock-elapsed window from the still-stale `lastActiveAt` and re-apply it on top of the environment's *already-advanced* durable tick, double-counting the crashed attempt's own already-committed progress. This was reproduced empirically (`70000ms` elapsed → tick `75000` instead of `70000`) before being fixed, not merely reasoned about.

### The actual fix (three parts, all “existing primitives only”, no new persisted field)

1. **Split `wakeWorld()`** (`lib/worldPersistence/hostService.ts`) into `catchUpCausalEnvironment()` (everything except the final commit) + `commitWakeCompletion()` (the one place `lastActiveAt`/`lastCheckpointTick` are written) + a thin, still-eager-committing `wakeWorld()` wrapper kept **only** for the one existing bare-environment caller (`/persistence/wake`, unmodified). Every downstream-composing caller (`lib/livingPopulation/hostService.ts`'s `wakeWorldWithPopulation`, and everything chained above it through `wakeWorldWithSpatialEcology`) now calls `catchUpCausalEnvironment` directly; only `wakeWorldWithSpatialEcology` — the real outermost composed function — calls `commitWakeCompletion`, and only after every downstream layer (including Sprint 16's own `TerritoryClaim` persistence) has already succeeded.
2. **`resolveTicksToApply`** (new, `packages/world-persistence-runtime/src/wakeCatchUpPlanner.ts`, pure, world-neutral, exported): computes the ticks one wake attempt owes as `(lastCheckpointTick + ticksElapsed(lastActiveAt, now)) − currentTick`, where `currentTick` is the environment's **actual, freshly-read** current tick — never assumed to still equal `lastCheckpointTick`. The two coincide in the overwhelmingly common (never-crashed) case, reducing exactly to the pre-Sprint-17 formula; they diverge exactly when a prior attempt's own environment catch-up already succeeded but its composed final commit never happened, in which case the already-advanced `currentTick` is subtracted back out instead of being re-applied on top of. Clamped at 0 (never negative) for the pre-existing, out-of-scope `advanceWorld()`-ahead-of-lifecycle edge case.
3. **A related, smaller finding while building this**: the provisional `WAKING`-transition write (executed before the ticks computation, for a world's very first-ever wake) previously fell back to `now()` when no prior lifecycle record existed at all, instead of the world's true seed time (`durableState.updatedAt`) — the same fallback the ticks computation itself already used. Fixed by loading `durableState` first and using one consistent anchor for both. Without this, a crash on a world's very first-ever wake would corrupt the retry's own `resolveTicksToApply` computation, discovered empirically while writing the crash-recovery test for exactly this case.

`WakeCatchUpPlan` (new, `packages/world-persistence-contracts/src/evolutionWindow.ts`: `{fromTick, toTick, ticksToApply, seasonCrossings}`) and `describeWakeCatchUpPlan` (same runtime package) are a thin, logging/test-assertion-only descriptor of what one catch-up call did — never a second causal mechanism, never persisted — attached to `CausalEnvironmentCatchUpResult`/`WakeWorldResult` as `catchUpPlan`.

## 4. Wake-chain integration into a real app route

New, additive route: `app/api/dev/account/living-vrindavan/persistence/wake-full/route.ts`, calling `wakeWorldWithSpatialEcology` — the first time the composed chain has been reachable from product code rather than only test suites. The existing `/persistence/wake` route (bare `wakeWorld`) is completely unmodified, per Sprint 17's own backward-compatibility requirement.

## 5. Season-boundary multi-crossing

`advanceWorldSimulation`'s per-tick loop already re-evaluates season transition on every tick with no explicit "spans a boundary" special case — claimed by construction, not previously proven for a 2-crossing catch-up. New synthetic 3-season fixture (`packages/world-persistence-runtime/src/multiSeasonCatchUp.test.ts`, never Vrindavan Canon — Vrindavan itself authors only 2 seasons) proves a single 6-tick dormant catch-up crossing 2 season boundaries reaches byte-for-byte the identical state as 6 single-tick advances, plus exact-boundary and one-tick-short regression checks.

## 6. Spatial propagation across a crash

`wakeWorldWithSpatialEcology` is the real target for the crash-recovery fix's final commit — no relocation step was needed, since it was already the correct outermost layer per Sprint 16's own closure. `lib/spatialEcology/wakeChainCrashRecovery.test.ts` proves the *full* composed chain (population through spatial territory claims) survives a crash modeled at the most realistic point — after adaptation succeeds but before spatial ecology's own `TerritoryClaim` persistence and the composed chain's real final commit — reaching the correct total tick exactly once on retry, with a fresh, non-stale spatial snapshot and zero duplicated `EncounterRecord`s.

## 7. Checkpoint/replay/idempotency audit

`docs/SPRINT17_IMPLEMENTATION_PREP.md` §4 step 4 asserted population/behavior state's overwrite-based persistence is "safe to redo... already true" but flagged it for verification rather than being taken on faith. `lib/livingPopulation/idempotentRedoAudit.test.ts` verifies this directly under the strongest realistic condition — repeated `wakeWorldWithPopulation` calls with **no** lifecycle commit ever happening in between (the exact shape a repeatedly-crashing caller would produce): a same-instant repeat is a genuine no-op (byte-identical entities/behavior/groups), and three partial advances across increasing wall-clock time reach the identical final state as one direct jump. The audit held; no change to population's own persistence was needed.

## 8. Multi-visitor / multi-instance wake consistency

`lib/spatialEcology/multiVisitorWakeConsistency.test.ts`: two visitors racing to wake the same dormant world through the *full* composed chain (not just the bare environment layer `hostService.test.ts:46-48` already covers) — exactly one succeeds, the other is rejected with `LeaseConflictError` before any downstream layer runs at all (the lease is acquired at the very first, innermost layer, before population/memory/social/etc. are ever touched, so a rejected concurrent attempt can never have partially applied anything). The lease-hold-duration question the prep document flagged as unconfirmed (§4 step 6) is resolved by this ordering, not by any new concurrency primitive. A second test confirms two world instances woken through the full chain remain completely isolated.

## 9. Vrindavan / Living Forest proofs

- **Vrindavan**: every test above runs against the real seeded Living Vrindavan world through the real composed Host layer.
- **Living Forest** (portability, world-neutral core): a 5th fixture added to `packages/world-persistence-runtime/src/livingForestPortability.test.ts`, composing this package's own primitives (`computeDeterministicCatchUp`, `InMemoryDurableWorldStateRepository`, `InMemoryWorldLifecycleRepository`, `InMemoryWorldLeaseRepository`, `resolveTicksToApply`) exactly the way `lib/worldPersistence/hostService.ts` composes them for Vrindavan — proving the crash-recovery fix's own core formula is world-neutral, not just the pre-existing catch-up/checkpoint/lease/lifecycle primitives the 4 tests before it already covered.

## 10. Renderer neutrality

No renderer/engine-specific identifier (`Actor`, `UObject`, `Blueprint`, `React`, `DOM`) appears anywhere in the files this sprint touched. `WakeCatchUpPlan`/`resolveTicksToApply` are pure data/functions with no rendering concern at all — consistent with every prior sprint's own posture.

## 11. Targeted/full regression results

- New/changed test files: `wakeCatchUpPlanner.test.ts` (6), `multiSeasonCatchUp.test.ts` (3), `crashRecoveryCatchUp.test.ts` (2), `wakeChainCrashRecovery.test.ts` (1), `multiVisitorWakeConsistency.test.ts` (2), `idempotentRedoAudit.test.ts` (2), plus 1 new test in `livingForestPortability.test.ts` — 17 new tests, all passing.
- `npx tsc --noEmit` (whole repo): clean, zero errors.
- `npm run test` (full existing suite + all new tests, one pass): **1514/1514 passing** (1497 pre-existing + 17 new — exact match, zero regressions).
- `eslint` targeted at every new/changed file: clean.
- `eslint .` (whole repo, one pass): 7 pre-existing errors / 7 pre-existing warnings, all in files this sprint never touched (`components/account/LivingWorldDetailView.tsx`, `packages/living-systems-contracts/src/snapshot.test.ts`, a handful of pre-existing intentionally-unused `_value`-prefixed test params) — identical set to what Sprint 16's own final report already recorded as pre-existing. None introduced by Sprint 17; none fixed, per the "fix only genuine Sprint 17 regressions" instruction.
- The existing dev route's bare-`wakeWorld()` backward-compatible path (`/persistence/wake`) was verified unchanged in behavior — `lib/worldPersistence/hostService.test.ts`'s own pre-existing tests against `wakeWorld` (including the lease-conflict and explicit-`advanceWorld` tests) pass unmodified.

## 12. Architectural invariants (held)

No second simulation engine was created; Sprints 7–16 were never rewritten, only composed against exactly as every prior sprint's own Host layer already does (`catchUpCausalEnvironment`/`commitWakeCompletion` are a *split* of Sprint 9's own `wakeWorld`, not a parallel primitive). Canon protections are unweakened — no Canon file was touched, no Vrindavan geography/season was invented (the multi-season proof uses a wholly synthetic fixture, matching the `otherWorldGrammar.test.ts`/`livingForest*Portability.test.ts` convention every prior sprint already established). `worldInstanceId` isolation absolute throughout. No database migration was applied; `033_spatial_ecology.sql` remains exactly as Sprint 16 left it.

## 13. Technical debt

1. `advanceWorld()` (Sprint 9's own explicit, owner-gated advancement, unrelated to wall-clock) never touches the lifecycle record, so a world that mixes explicit `advanceWorld()` calls with later dormancy/wake can leave `resolveTicksToApply`'s target computation behind the environment's actual tick — handled by clamping at 0 (never throwing), not reconciled. Pre-existing combination, out of this sprint's scope; noted for whichever future sprint first needs `advanceWorld` and dormancy-wake to compose correctly together.
2. The crash-recovery proofs in this sprint model a crash as "stop calling deeper into the chain, then retry" (the only mechanism available in this in-memory, single-process reference environment) rather than a literal process kill — the same limitation Sprint 9's own `recovery.test.ts` crash-recovery proof already accepted for checkpoint/event-log recovery.
3. DB-backed `TerritoryClaimRepository` + applying migration `033` remain deferred, per the repo's own established convention (migrations 026–032 also prepared-not-applied) — revisit only if a specific future sprint requires a durability proof for territory claims across a *real* process crash (this sprint's own crash-recovery proofs do not require it, since `TerritoryClaim` is idempotent-append and cheaply re-derivable).

## 14. Blockers

None. Implementation complete, tested, typechecked, linted (for all touched files), and regression-clean.

## 15. Recommendation for Sprint 18

Sprint 17 lands a corrected, verified wake-chain sequencing invariant — commit last, compute the remaining gap against the environment's own actual current tick, never assume it still matches the last confirmed anchor — that every future layer composing further on top of `wakeWorldWithSpatialEcology` should preserve rather than reintroduce a shortcut around. Sprint 18 (canonical event integration, per its own already-prepared `feature/sprint18-implementation-prep` @ `f21220b`) was explicitly blocked on this landing; it can now proceed.

---

LONG-HORIZON WORLD EVOLUTION FOUNDATION VERIFIED — READY FOR SPRINT 18
