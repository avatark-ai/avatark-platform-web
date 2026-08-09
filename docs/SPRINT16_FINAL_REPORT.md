# Sprint 16 Final Report — Spatial Ecology & Territory

## 1. Repo / branch / commit

- Repo: `avatark-platform-web`
- Base: `feature/sprint15-world-adaptation` @ `17c4bb37a56e42cbcf6bc55112f066a42067e1b0` (completed, authoritative Sprint 15 runtime — 1451/1451 tests passing, typecheck clean, lint clean, per the unlock instruction)
- Implementation branch: `feature/sprint16-spatial-ecology`, isolated worktree, no other Sprint 15/16 Phase 0/17/18/19 worktree touched
- Phase 0 design input (read-only): `feature/sprint16-phase0-spatial-architecture` @ `c67820e`

## 2. Sprint 15 reconciliation result

Phase 0 left the adaptation seam as an untyped `adaptationBias?: unknown` placeholder. Reconciled against the real Sprint 15 code:

- The real type is `AdaptationEffect` (`@avatark/world-adaptation-contracts`), a closed, domain-tagged union (`ENTITY`/`RELATIONSHIP`/`PLACE`/`GROUP`/`WORLD_POSSIBILITY`), not a generic bias scalar.
- `PLACE`-domain kinds map directly onto Sprint 16's own needs: `RESOURCE_PRESSURE`/`ENCOUNTER_ELIGIBILITY` → Patch ecological pressure; `GROUP`-domain `MOVEMENT_TENDENCY` and `ENTITY`-domain `LOCATION_PREFERENCE`/`RESOURCE_PREFERENCE_BIAS` → the movement-context seam.
- Read path used: `getWorldAdaptationEffects(worldInstanceId)` (`lib/worldAdaptation/hostService.ts`), the same Host-composed getter every renderer/embodiment projection already uses. No new read path invented.
- One real, non-obvious finding during reconciliation: `PLACE`-domain effects do **not** always carry a plain `LocationId`. Rule D's own `RESOURCE_PRESSURE`/`RESOURCE_AVAILABILITY_CONSEQUENCE` kinds are keyed by Sprint 15's own composite subject `${locationId}:${category}` (`adaptationSignals.ts`), while encounter-derived kinds (`ENCOUNTER_ELIGIBILITY`, etc.) carry a plain `LocationId`. A first pass silently missed this and the adaptation→spatial proof test failed with `ecologicalPressure` staying `0`. Fixed with a small, explicit `resolvePlaceEffectLocationId` helper (`spatial-ecology-runtime/src/adaptationEffectLocation.ts`) that applies the exact same parsing `lib/worldAdaptation/hostService.ts`'s own `applyAdaptationEffect` already does — never a second, divergent interpretation of Sprint 15's convention.
- Composition point used: `wakeWorldWithSpatialEcology` calls `wakeWorldWithAdaptation` (Sprint 15's own outermost wake function) unmodified — extending, not modifying, the chain `wakeWorld → …→ wakeWorldWithEncounterRealization → wakeWorldWithAdaptation` that Sprint 15 already completed.

## 3. Packages/modules created

- `@avatark/spatial-ecology-contracts` — types only. Files: `ids.ts`, `hierarchy.ts` (Domain/Sector/Quadrant/Patch/LocalPlace/SpatialGrammar/SpatialMembership), `topology.ts` (SpatialRelation/SpatialEdge), `patchState.ts`, `territory.ts` (TerritoryClaim/TerritoryPressure), `route.ts`, `movement.ts` (SpatialMovementContext), `snapshot.ts` (SpatialSnapshot/SpatialDelta), `index.ts`.
- `@avatark/spatial-ecology-runtime` — pure functions + one in-memory reference repository. Files: `membershipIndex.ts`, `topologyResolution.ts`, `patchStateResolution.ts`, `occupancyRollup.ts`, `territoryResolution.ts`, `routeResolution.ts`, `movementContext.ts`, `snapshotDiff.ts`, `adaptationEffectLocation.ts`, `inMemoryRepositories.ts`, `index.ts`, plus 9 test files (39 tests) including `livingForestSpatialEcologyPortability.test.ts`.
- `lib/spatialEcology/` (Host layer) — `vrindavanSpatialDefinition.ts` (the real, Canon-bounded Vrindavan grammar), `singleton.ts`, `hostService.ts` (`wakeWorldWithSpatialEcology`, `getSpatialSnapshot`, `getSpatialMovementContext`, `getEmbodimentWithSpatialEcology`), `hostService.test.ts` (7 tests).
- No existing Sprint 7–15 package was modified. `package.json`/`pnpm-lock.yaml` gained the two new workspace dependencies; `supabase/scripts/run-platform-migrations.js` gained one registration line.

## 4. Spatial hierarchy implementation

`Domain → Sector → Quadrant → Patch → Local Place → Entity`, exactly as Phase 0 specified, with cardinality as world-grammar data:

- **Living Vrindavan**: 1 Domain, 1 **degenerate** Sector, 1 **degenerate** Quadrant (Canon authorizes no finer subdivision at Vrindavan's ~500m scale — explicitly documented, not silently assumed), 4 Patches = 4 Local Places = the 4 already-Approved locations (`vrindavan-entry`, `yamuna`, `kadamba-grove`, `govardhan-path`). No sub-location geography invented.
- **Living Forest fixture** (test-only, no Canon, matching the established `livingForest*Portability.test.ts` convention every prior sprint already uses): 1 Domain, 1 Sector (`F01`), 4 Quadrants (NW/NE/SW/SE), 4 Patches per Quadrant (16 total), 16 Local Places — built programmatically in the test file, proving the identical hierarchy scales two orders of magnitude with zero new engine code.

## 5. Identity model

Plain string aliases (`DomainId`/`SectorId`/`QuadrantId`/`PatchId`/`LocalPlaceId`/`SpatialEdgeId`/`RouteId`/`TerritoryClaimId`), matching the repo's own unbranded convention. Assigned once by the authored `SpatialGrammar`, never derived from renderer state. `LivingEntityState.locationId` is completely unmodified — spatial membership (`SpatialMembership`) is always a derived lookup (`buildSpatialMembershipIndex`), never stored on the entity.

## 6. Topology model

`SpatialRelation = CONNECTED_TO | ADJACENT_TO | UPSTREAM_OF | DOWNSTREAM_OF | CORRIDOR | BARRIER`. Reachability (`reachablePatchIds`) is a BFS over `traversable` edges only, treated as undirected — a `relation` label is metadata, never a second reachability rule. Verified: a non-traversable `BARRIER` blocks reachability despite geographic adjacency; an authored `CORRIDOR` reaches a non-adjacent Patch (both proven for Vrindavan-scale and Forest-scale fixtures).

## 7. Route/reachability model

`RouteDefinition` (static, authored, an ordered sequence of edge ids) / `RouteState` (always derived — traversable only if every named edge currently is). Vrindavan's own StudioK-derived `"corridor"` resource tag on `govardhan-path` is represented as `route-govardhan-path`, one real Route, not fabricated.

## 8. PatchDefinition / PatchState result

`PatchDefinition` is static (habitat type, contained `LocationId`s). `PatchState` is **always derived, never persisted** — no repository exists for it. Its `vegetationCondition`/`hydrologyCondition` pass through Sprint 7's single world-global `EnvironmentalState` unchanged (Phase 0's own explicit decision: no fabricated per-habitat weighting without Canon authorization); `resourceAvailability`/`occupancyLevel`/`presentEntityIds`/`presentGroupIds`/`movementPermeability` are genuinely Patch-specific, derived from Sprint 13's `ResourceOpportunity`/`PlaceOccupancy` and this Patch's own topology. `ecologicalPressure` (0 or 1) reflects a currently-active `PLACE`-domain Sprint 15 effect targeting a contained location — the adaptation→spatial seam.

## 9. Spatial environment result

No second causal engine. `resolvePatchState` reads Sprint 7's `EnvironmentalState` directly; every Patch reflects the identical world-global band values (there is no Canon-authorized basis yet for differential per-habitat weighting — Phase 0's own honest position, preserved). What genuinely differs per Patch is resource availability (via `ResourceTag` heterogeneity, e.g. only Yamuna's Patch carries `water`) and occupancy/permeability — proven directly in the spatial causal test.

## 10. Territory/home-range integration

`TerritoryClaim`/`TerritoryPressure` are a **read-only aggregation over Sprint 12's own `HomeRange`** — never a second ownership record, never a duplicate `preferredLocationIds`. `resolveTerritoryClaims` maps each `HomeRange.preferredLocationIds` entry to the Patch it resolves into (`PRIMARY` for the first preference, `SECONDARY` otherwise); `resolveTerritoryPressure` rolls claims up per Patch. Verified against the real seeded Vrindavan `HomeRange`s (cow herd → `yamuna`, bird flock → `kadamba-grove`): 2 claims, both `PRIMARY`, zero contest — and, separately, a two-owner-one-Patch contest scenario proven correct in the Forest fixture (deer herd + wolf pack both claiming the same clearing).

## 11. Movement integration

`SpatialMovementContext` (current Patch, reachable Patches, own Territory claims, relevant `AdaptationEffect`s) is a pure, read-only composition — Sprint 10's own `MovementIntent` is completely untouched, no pathfinding or NavMesh was implemented. Verified end-to-end for the real seeded cow entity: `currentPatchId = patch-yamuna`, all 4 Patches reachable through the Yamuna hub, exactly its own herd's Territory claim surfaced (never the bird flock's).

## 12. Occupancy integration

No competing occupancy truth. Patch occupancy is a rollup of Sprint 13's own per-`LocationId` `PlaceOccupancy` (busiest-wins over the existing closed `OccupancyLevel` order); Territory occupancy is (conceptually, not separately implemented this sprint — matching Phase 0's own scope) whichever Patches a claim's own occupancy rollup covers; Route traversal remains a transient, stateless fact (`RouteState`). `resolvePlaceOccupancy` itself was never modified or duplicated.

## 13. Adaptation → spatial behavior proof

Real, not synthetic: the pre-existing Sprint 15 rule `avatark-adaptation-place-resource-scarcity-pressure` (threshold 2, decay 0.1) was driven via `applyWorldAdaptation` with real `resourceReadings` (`yamuna`/`water` persistently unavailable) — the exact same mechanism Sprint 15's own `SCENARIO D` test already exercises, composed here, not reimplemented. Once the rule crossed its threshold and persisted a `PLACE`/`RESOURCE_PRESSURE` effect, `getSpatialSnapshot` correctly raised `patch-yamuna`'s own `ecologicalPressure` to `1` while `patch-kadamba-grove`/`patch-govardhan-path` stayed at `0` — proving both the causal link and the absence of cross-Patch leakage. Test: `lib/spatialEcology/hostService.test.ts`, "Spatial causal proof."

## 14. Vrindavan reference proof

`lib/spatialEcology/hostService.test.ts` proves, against the real seeded world: (a) `wakeWorldWithSpatialEcology` composes the full Sprint 7→15 chain and returns all 4 Patches + 1 Route; (b) Territory claims derive correctly from the real seeded `HomeRange`s; (c) the adaptation→spatial causal chain (§13); (d) deterministic replay (§16); (e) movement context composition (§11). No invented Canon anywhere in this path.

## 15. Living Forest reuse proof

`packages/spatial-ecology-runtime/src/livingForestSpatialEcologyPortability.test.ts` — a 16-Patch, 4-Quadrant `F01` grammar built programmatically, run through the **identical** `resolvePatchState`/`resolveTerritoryClaims`/`resolveTerritoryPressure`/`reachablePatchIds`/`buildSpatialMovementContext` functions the Vrindavan proof uses. Zero Forest-specific branching exists anywhere in `spatial-ecology-runtime`'s own `src/` outside this one test file (verified by inspection — no file other than the portability test and the Vrindavan Host-layer fixture mentions "forest" or "vrindavan").

## 16. Persistence/checkpoint/replay result

Only `TerritoryClaim` is durable (`InMemoryTerritoryClaimRepository`, `worldId`-scoped, idempotent-append by content-derived id `territory-claim:{homeRangeId}:{patchId}`). `PatchState`/`TerritoryPressure`/`RouteState` have **no repository at all** — they are pure functions of already-durable state, so "replay" for them reduces to determinism, proven directly: `getSpatialSnapshot` called twice against identical persisted state returns `deepEqual` results (test: "Replay" in `hostService.test.ts`). `WorldCheckpoint` (Sprint 9) itself was **not modified** this sprint — Sprint 16 Phase 0's own proposed additive `territoryClaims?` checkpoint field was judged unnecessary for this implementation slice, since `TerritoryClaim` is trivially re-derivable from `HomeRange` + the static grammar on any wake; this is recorded as technical debt (§22) rather than silently dropped.

## 17. Multi-instance isolation

Proven directly: two world instances (`world-16-multi-instance-a`/`-b`) sharing the identical Vrindavan grammar were both woken; instance A was driven into Yamuna resource pressure, instance B was not touched. `getSpatialSnapshot` correctly shows `ecologicalPressure = 1` for A's `patch-yamuna` and `0` for B's; `territoryClaimRepository.listByWorld` returns disjoint, correctly-`worldId`-tagged claim sets for each. `worldInstanceId` is the sole isolation key everywhere in the new code, matching Sprint 9's own absolute requirement.

## 18. Renderer-neutrality result

Verified by inspection: no file under `packages/spatial-ecology-{contracts,runtime}/src` or `lib/spatialEcology` references `Actor`, `UObject`, `Blueprint`, `World Partition`, `NavMesh`, `Landscape`, `PCG`, `Niagara`, `React`, `DOM`, or `CSS`. `SpatialSnapshot`/`SpatialDelta` mirror Sprint 8's own `WorldSnapshot`/`diffWorldEmbodiment` posture exactly — a renderer receives a two-snapshot diff (`diffSpatialSnapshot`), never a tick replay. `@avatark/world-embodiment-contracts` was **not** widened a further time (Sprint 10 widened it once; every sprint since, including this one, composes alongside it via a sibling wrapper — `WorldEmbodimentSnapshotWithSpatialEcology`).

## 19. Migrations prepared/applied status

**Prepared, registered, NOT applied**: `supabase/migrations/033_spatial_ecology.sql` (one table, `territory_claims`, matching the one durable type this sprint actually introduces), registered in `supabase/scripts/run-platform-migrations.js`'s `MIGRATION_ORDER` for traceability, following migrations 026–032's own identical precedent exactly. No database connection was made; no migration was executed. Note: Sprint 16 Phase 0's own architecture doc stated "no migration exists project-wide" — that was accurate as of the Sprint 14 tip it was written against; Sprint 15 (`17c4bb3`) introduced migrations 026–032 following this same prepared-not-applied posture, which this implementation re-verified against actual current code before proceeding, and now extends with 033.

## 20. Targeted/full regression results

- New package tests: `packages/spatial-ecology-runtime` — 39/39 passing.
- New Host tests: `lib/spatialEcology/hostService.test.ts` — 7/7 passing.
- `npx tsc --noEmit` (whole repo): clean, zero errors.
- `pnpm test` (full existing suite + all new tests, one pass): **1497/1497 passing** (1451 pre-existing + 46 new — exact match, zero regressions).
- `eslint` targeted at every new/changed file: clean (one warning found and fixed for real — an unused `now` parameter was wired through to `getPopulationSnapshot`, a genuine, correct use, not a lint suppression).
- `eslint .` (whole repo, one pass): 7 pre-existing errors / 7 pre-existing warnings, all in files this sprint never touched (`components/account/LivingWorldDetailView.tsx`, `packages/living-systems-contracts/src/snapshot.test.ts`, a handful of pre-existing intentionally-unused `_value`-prefixed test params). None introduced by Sprint 16; none fixed, per the "fix only real Sprint 16 regressions" instruction.

## 21. Architectural invariants (held)

Living Systems remains authoritative; no second causal/movement/occupancy/territory/adaptation/persistence engine was created (verified per-domain in §3 of the Phase 0 doc, re-confirmed here: environment reused unchanged, `HomeRange` reused unchanged, `PlaceOccupancy` reused unchanged, `AdaptationEffect` reused unchanged, `WorldCheckpoint`/lease/lifecycle reused unchanged); `worldInstanceId` isolation absolute; renderer neutrality intact; no Canon sub-geography invented for Vrindavan; Sector/Quadrant degeneracy explicitly documented, not hidden.

## 22. Technical debt

1. `WorldCheckpoint` was not extended with a `territoryClaims` field (Phase 0's own §19 proposal) — judged unnecessary this slice since claims re-derive cheaply from `HomeRange` on any wake; revisit if `TerritoryClaim` ever grows state that is NOT re-derivable (e.g. genuine contest-resolution history).
2. Territory contest resolution (who "wins" a contested Patch) is explicitly not implemented — `TerritoryPressure` is a read model only, matching Phase 0's own documented deferral.
3. `PatchState.ecologicalPressure` is boolean-as-number (0 or 1), not a magnitude — Sprint 15 itself exposes no continuous magnitude beyond "in force," so no fabricated precision was introduced; revisit if Sprint 15 ever adds one.
4. The Living Forest fixture lives only as a runtime-package test, with no Host-layer (`lib/`) wiring or API route — matching the exact precedent every other Sprint 7–15 Forest portability test already set, but noted here in case a future sprint expects Forest to be reachable via a real endpoint.

## 23. Blockers

None. Implementation complete, tested, typechecked, linted (for all touched files), and regression-clean.

## 24. Recommendation for Sprint 17

Sprint 16 lands exactly the spatial primitives Sprint 17's own long-horizon evolution work needs to compose against: `PatchState` is already the correct place for spatially-scoped environmental propagation to attach; `TerritoryClaim`/`TerritoryPressure` are already the correct place for adaptation-driven territorial drift over long absences to attach; `SpatialMovementContext` is already the correct seam for a future movement resolver. Recommend Sprint 17 (long-horizon world evolution) proceed by extending the existing `wakeWorldWithSpatialEcology` composition point exactly as every prior sprint has extended the one before it — never a parallel wake path — and revisit this report's §22 technical debt item 1 (`WorldCheckpoint` scope) specifically in light of Sprint 17's own already-identified crash-recovery/evolution-horizon findings, since long-horizon catch-up is precisely the scenario that would first require `TerritoryClaim`'s durability guarantees to be checkpoint-consistent rather than merely re-derivable.

---

SPATIAL ECOLOGY & TERRITORY FOUNDATION VERIFIED — READY FOR SPRINT 17
