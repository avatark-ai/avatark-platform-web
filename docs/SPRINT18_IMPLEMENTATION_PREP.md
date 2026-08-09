---
sprint: 18
phase: implementation-prep
title: Canonical Event Integration — Reconciliation Against Real Sprint 14/15/16 Code
status: PREP COMPLETE — BLOCKED ON SPRINT 17 CLOSURE
base: feature/sprint16-spatial-ecology @ 5d1c76d
reconciles: docs/SPRINT18_PHASE0_CANONICAL_EVENT_ARCHITECTURE.md (feature/sprint18-phase0-canonical-events @ 47cb0e1)
---

# Sprint 18 Implementation Prep

This document reconciles the Sprint 18 Phase 0 architecture
(`SPRINT18_PHASE0_CANONICAL_EVENT_ARCHITECTURE.md`, `47cb0e1`) against the **real, landed**
Sprint 16 spatial-ecology code (`feature/sprint16-spatial-ecology @ 5d1c76d`, 1497/1497 tests)
and the real Sprint 9/11/14/15 runtime it composes. Every identifier below was read directly
from source at `5d1c76d` — nothing here is a hypothetical interface. Phase 0's own repeated
caveat — "SUBJECT TO SPRINT 16 RECONCILIATION" — is resolved in §8 and §11 of this document.

This is a docs-only artifact. No runtime package, migration, or test file is touched.

---

## 1. Exact canonical-event boundary

An ordinary simulation tick is anything `wakeWorld` → `wakeWorldWithPopulation` → … →
`wakeWorldWithEncounterRealization` → `wakeWorldWithAdaptation` → `wakeWorldWithSpatialEcology`
already derives from world-owned state with no StudioK-authored trigger. A **canonical event**
is the one category of occurrence whose *permission to exist* originates outside the
simulation entirely — in a vendored, checksum-verified StudioK artifact — even though its
*consequences* are still resolved by the same simulation. Concretely: a canonical event is
identified by a `CanonicalEventIdentity` (Phase 0 §5) that traces back through
`artifactIngestion.ts` to a `manifest.json` entry; an emergent occurrence (an
`EncounterConsequence`, an `AdaptationEffect`, a `TerritoryClaim`) has no such trace and never
acquires one retroactively. The boundary is therefore provenance-shaped, not behavior-shaped:
a canonical event and an emergent encounter can produce structurally identical
`EncounterConsequence` values (Phase 0 §16, confirmed unmodified at `5d1c76d` — the union
still has no `"CANONICAL"` branch); what distinguishes them is solely whether a
`CanonicalEventProvenance.definitionContentHash` exists upstream.

## 2. Authored/Canon event identity

Unchanged from Phase 0 §5, reconfirmed against `5d1c76d`: `CanonicalEventIdentity` is
`{ canonicalEventId, definitionContentHash }`, sourced from the existing
`artifactIngestion.ts` → `manifest.json` checksum field — the same mechanism every other
vendored artifact (world/systems/experience) already uses. Sprint 16 introduced no new
artifact kind and no new identity scheme, so there is nothing to reconcile here; this section
is confirmed, not revised.

## 3. Idempotency

Unchanged from Phase 0 §12: `deriveCanonicalActivationId(worldInstanceId, canonicalEventId,
definitionContentHash, activationTick)` follows the exact SHA-256-over-ordered-fields pattern
`deriveWorldSystemEventId` (Sprint 9), `deriveMemoryRecordId` (Sprint 11), and
`deriveEncounterRecordId` (Sprint 14) already establish. Sprint 16 added a **fourth** instance
of this same discipline — `TerritoryClaim.id`, content-derived as
`territory-claim:{homeRangeId}:{patchId}` (`SPRINT16_FINAL_REPORT.md` §16) — which reconfirms
rather than changes the pattern. `TerritoryClaimRepository.append()` (`packages/spatial-ecology-
contracts/src/territory.ts`) returns `{ status: "appended" | "duplicate_ignored" }` — a
pre-check-then-work order, matching Phase 0's own required "checked before any consequence
work runs" discipline. `deriveCanonicalActivationId` should follow this exact
`append`-with-duplicate-ignored return shape, not a plain boolean.

## 4. Provenance

Unchanged from Phase 0 §23: `CanonicalEventProvenance { canonDocIds, specId, specVersion,
definitionContentHash }`, kept distinct from `MemoryProvenance` and `WorldSnapshotProvenance`.
Sprint 16 introduced no fourth provenance concept — `TerritoryClaim` carries no
`*Provenance` field at all, since it denormalizes `ownerId`/`ownerType` directly from
`HomeRange` rather than tracing to an external artifact. Nothing to reconcile.

## 5. Protected Canon firewall

Unchanged from Phase 0 §1/§24: `ProtectedNarrativeStateRepository` (`packages/living-systems-
contracts/src/protectedNarrative.ts`) has only `get(worldId)`, no write method. Sprint 16 adds
a **fifth** occurrence of the identical "read-only repository, structurally, not by
convention" pattern: `PatchState`/`TerritoryPressure`/`RouteState` have **no repository at
all** (`SPRINT16_FINAL_REPORT.md` §16 — "no repository, no `save`"), and the only durable
Sprint 16 type, `TerritoryClaim`, has `append`/`listByPatch`/`listByWorld` — append-only, no
`update`/`delete`. The canonical-event dependency-boundary test (Phase 0 §24) should extend
its regex scan to also assert `spatialEcologyRepositor\w*\.(save|put|set|write|mutate|update)\(`
never appears in `canonical-event-runtime`, alongside the existing
`protectedNarrative\w*\.` and (new, this doc) `canonicalEventDefinition\w*\.` scans — one
`dependencyBoundaries.test.ts`-style file, three subjects, not three files.

## 6. Event → consequence flow

Unchanged from Phase 0 §16: `CanonicalEventProjection.mandatedFacts` become inputs to
`resolveEncounterRealization` (`lib/encounterRealization/hostService.ts`,
`wakeWorldWithEncounterRealization`). `EncounterConsequence`'s closed union is **confirmed
unmodified** at `5d1c76d` — Sprint 16 did not touch `encounter-realization-contracts` at all
(§3 of `SPRINT16_FINAL_REPORT.md`: "No existing Sprint 7–15 package was modified"). A
canonical event's mandated fact becomes a semantic stimulus consumed the same way
`wakeWorldWithSpatialEcology` consumes `getWorldAdaptationEffects(worldInstanceId)` today —
i.e. the *composition* pattern to imitate is Sprint 16's own outermost wake function reading
an existing upstream getter, not writing a new one.

## 7. Consequence → world memory flow

Unchanged from Phase 0 §15: a completed projection produces a `WorldEvent` via the existing
`deriveWorldEvents` pipeline (Sprint 11, `wakeWorldWithMemory` /
`lib/worldMemory/hostService.ts`), tagged `category: "CANONICAL_EVENT_OCCURRED"`. Confirmed:
`wakeWorldWithMemory`'s real signature at `5d1c76d`
(`lib/worldMemory/hostService.ts:64`) takes `relatedEntityIdsByEntityId`,
`homeRangeLocationIdsByOwnerId`, `resolveDayPhaseForTick`, `routineEntriesByArchetypeId` as
optional params, composed transitively through `wakeWorldWithSpatialEcology` →
`wakeWorldWithAdaptation` → … → `wakeWorldWithMemory`; canonical-event wake wiring joins this
same chain one layer further out, exactly as every sprint since 12 has, never by reaching
around it to call `wakeWorldWithMemory` directly.

## 8. Consequence → Sprint 16 spatial/ecological state flow (RECONCILED — no longer hypothetical)

This is the section Phase 0 explicitly marked "SUBJECT TO SPRINT 16 RECONCILIATION" (§11,
§18) and could not resolve because Sprint 16 did not exist yet. It now does. Real findings
from `5d1c76d`:

- **`CanonicalEventProjectionScope` (Phase 0 §11) is adopted, with real Sprint 16 identifiers
  substituted for the "ILLUSTRATIVE ONLY" placeholders**:

  ```ts
  type CanonicalEventProjectionScope =
    | { level: "WORLD" }
    | { level: "DOMAIN"; domainId: DomainId }       // packages/spatial-ecology-contracts/src/ids.ts
    | { level: "SECTOR"; sectorId: SectorId }
    | { level: "QUADRANT"; quadrantId: QuadrantId }
    | { level: "PATCH"; patchId: PatchId }
    | { level: "LOCAL_PLACE"; localPlaceId: LocalPlaceId }
    | { level: "ENTITY_SET"; entityIds: EntityId[] }
  ```

  These are the exact five hierarchy levels `SpatialGrammar` (`packages/spatial-ecology-
  contracts/src/hierarchy.ts`) defines — `Domain → Sector → Quadrant → Patch → Local Place` —
  confirmed real, not the Phase 0-era `SPRINT16_PHASE0_SPATIAL_ARCHITECTURE.md` sketch.

- **`MandatedFact`'s `LOCATION_ACTIVE`/`LOCATION_REACHED` variants (Phase 0 §7, §10) resolve
  spatial scope via the existing `SpatialMembership` lookup**, not a new lookup:
  `buildSpatialMembershipIndex(VRINDAVAN_SPATIAL_GRAMMAR)` (`packages/spatial-ecology-runtime/
  src/membershipIndex.ts`, composed in `lib/spatialEcology/hostService.ts` as the module-scoped
  `MEMBERSHIP_INDEX`) already maps any `LocationId` → `{ localPlaceId, patchId, quadrantId,
  sectorId, domainId }`. A `MandatedFact` naming a `LocationId` is scope-resolved by this one
  existing index — canonical-event-runtime must not build a second membership index.

- **The actual write path for a canonical event's spatial/ecological consequence is
  `AdaptationEffect`, not a new Sprint 18 write into Sprint 16 state.** Sprint 16 confirmed
  (`SPRINT16_FINAL_REPORT.md` §13) that `PatchState.ecologicalPressure` is driven exclusively
  by `getWorldAdaptationEffects(worldInstanceId)` filtered to `domain === "PLACE"`
  (`lib/spatialEcology/hostService.ts:61-62`, `getSpatialSnapshot`). There is no other spatial
  write surface — `PatchState`/`TerritoryPressure`/`RouteState` are pure derivations with **no
  repository** (§5 above). Therefore: a canonical event that must affect Patch-level
  ecological state does so by producing a `WorldEvent` (§7 above) that becomes a Sprint 15
  `AdaptationSignal` (Phase 0 §17, unchanged and now doubly confirmed — Sprint 16 built
  directly on top of this exact seam), which an authored `AdaptationRule` turns into a `PLACE`-
  domain `AdaptationEffect` (`RESOURCE_PRESSURE` or `ENCOUNTER_ELIGIBILITY`), which
  `resolvePatchState` then reflects. **Sprint 18 introduces no new spatial write path at all**
  — it only needs an authored `AdaptationRule` that reacts to `CANONICAL_EVENT_OCCURRED`
  `WorldEvent`s, which is a StudioK/content-authoring task, not new runtime.
  - One real constraint carried over from Sprint 16's own reconciliation debt
    (`SPRINT16_FINAL_REPORT.md` §2): `PLACE`-domain effects are not uniformly keyed by a plain
    `LocationId` — Rule-D-style effects use the composite subject `${locationId}:${category}`
    (`adaptationSignals.ts`), while encounter-derived effects use a plain `LocationId`. Any
    canonical-event-authored `AdaptationRule` that emits a `PLACE`-domain effect must reuse
    `resolvePlaceEffectLocationId` (`packages/spatial-ecology-runtime/src/
    adaptationEffectLocation.ts`) rather than re-deriving this parsing — this is the one place
    a naive implementation is most likely to silently produce `ecologicalPressure` that never
    rises, exactly as Sprint 16's own first pass did.
- **`TerritoryClaim`/`TerritoryPressure` are out of scope for canonical-event consequences in
  this slice.** They derive solely from `HomeRange` (Sprint 12); no Phase 0 mandated-fact kind
  proposes authored territory assignment, and none should be added speculatively.

## 9. Checkpoint/replay semantics

Unchanged from Phase 0 §14, and now anchored to the real `WorldCheckpoint` shape:
`packages/world-persistence-contracts/src/checkpoint.ts` defines `WorldCheckpoint`;
`packages/world-persistence-runtime/src/checkpoint.ts` exports `createCheckpoint` and
`recoverAuthoritativeState`. Phase 0's proposed additive field,
`canonicalProjectionHistory: activationId[]`, attaches here. Sprint 16 explicitly **declined**
to add its own analogous field (`territoryClaims?`) to `WorldCheckpoint`
(`SPRINT16_FINAL_REPORT.md` §22, item 1) because `TerritoryClaim` is cheaply re-derivable from
`HomeRange` on every wake. Canonical events are the opposite case: an `activationId`'s
consequences are **not** re-derivable from other durable state (mandated facts don't
regenerate themselves), so `canonicalProjectionHistory` is a **required** additive checkpoint
field, not optional in the way Sprint 16 judged its own field to be. This is the one place
Sprint 16's precedent argues *against* imitation, and the reasoning must be stated explicitly
in the implementation PR so a reviewer doesn't flag it as inconsistent with §5's "reuse the
pattern" instinct.

## 10. Multi-world-instance isolation

Unchanged from Phase 0 §11, reconfirmed by Sprint 16's own proof
(`SPRINT16_FINAL_REPORT.md` §17): two instances (`world-16-multi-instance-a`/`-b`) sharing an
identical `SpatialGrammar` diverge correctly, with `worldInstanceId` as the sole isolation key
everywhere, including `territoryClaimRepository.listByWorld(worldInstanceId)`. Canonical-event
projection state (`WorldInstanceCanonicalProjectionState`) must follow this identical
`worldId`/`worldInstanceId`-scoped repository shape — `listByWorld`-style, never a global
table scanned and filtered in application code.

## 11. Renderer neutrality

Unchanged from Phase 0 §21, reconfirmed by Sprint 16's own inspection proof
(`SPRINT16_FINAL_REPORT.md` §18): no file under `packages/spatial-ecology-{contracts,runtime}`
or `lib/spatialEcology` references any renderer-specific symbol (`Actor`, `UObject`, `React`,
`DOM`, etc.), and `SpatialSnapshot`/`SpatialDelta` mirror the `WorldSnapshot`/
`diffWorldEmbodiment` two-snapshot-diff posture exactly. `CanonicalEventProjection`'s
eventual presentation must follow the identical discipline — `MandatedFact` values remain
intent strings (`PARTICIPANT_PRESENT`, `LOCATION_ACTIVE`), never geometry — and should compose
into `WorldEmbodimentSnapshotWithSpatialEcology` (`lib/spatialEcology/hostService.ts:127`) the
same way that type itself composes one layer above `WorldEmbodimentSnapshotWithAdaptation`,
never by widening `@avatark/world-embodiment-contracts` a further time (Sprint 16 explicitly
declined to widen it a second time; Sprint 18 should decline a third).

## 12. Vrindavan proof

Grounded in real seeded Vrindavan state (`lib/spatialEcology/vrindavanSpatialDefinition.ts`,
`VRINDAVAN_SPATIAL_GRAMMAR`: 4 Patches — `patch-vrindavan-entry`, `patch-yamuna`,
`patch-kadamba-grove`, `patch-govardhan-path`). Scenario: a StudioK-authored canonical event
`canonical-event-govardhan-lifting` has activation condition
`{ kind: "LOCATION_REACHED", locationId: "govardhan-path" }` and a single mandated fact
`{ kind: "LOCATION_ACTIVE", locationId: "govardhan-path" }`. On activation: (a) a `WorldEvent`
(`CANONICAL_EVENT_OCCURRED`, `causalReferences: [{ kind: "canonicalEvent", ref:
"canonical-event-govardhan-lifting" }]`) is durably recorded via the existing
`deriveWorldEvents` pipeline; (b) an authored `AdaptationRule` reacting to that event category
raises a `PLACE`/`ENCOUNTER_ELIGIBILITY` effect scoped to `govardhan-path`; (c)
`getSpatialSnapshot` reflects `patch-govardhan-path.ecologicalPressure = 1` while the other
three Patches remain `0` — the identical cross-Patch-isolation shape Sprint 16's own §13 proof
already establishes for emergent pressure, now driven by an authored trigger instead of a
resource-scarcity signal.

## 13. Living Forest portability proof

Grounded in the real `livingForestSpatialEcologyPortability.test.ts` fixture convention
(`packages/spatial-ecology-runtime/src/`) — a 16-Patch, 4-Quadrant, non-Vrindavan grammar built
programmatically, run through the identical runtime functions with zero Forest-specific
branching anywhere in `spatial-ecology-runtime/src` outside that one test file
(`SPRINT16_FINAL_REPORT.md` §15). The canonical-event portability proof (Phase 0 §28, proof G)
composes directly on top: a synthetic `canonical-event-alpha` fixture, scoped
`{ level: "PATCH"; patchId: "F01-Q-NW-P01" }` (a real Forest-fixture Patch id shape, not
Vrindavan's), is activated against the Forest grammar through the same
`canonical-event-runtime` functions used in §12, asserting (a) identical activation/idempotency
behavior, (b) zero Vrindavan-specific string or type appears anywhere in
`canonical-event-contracts`/`canonical-event-runtime`, matching the inspection-based proof
method Sprint 16 §15/§18 already used rather than a new proof technique.

## 14. Exact dependency on Sprint 17

**Hard blocking dependency, not advisory.** Sprint 17 Phase 0
(`feature/sprint17-phase0-long-horizon-evolution @ 8018899`) documents a real, unfixed bug in
the existing Sprint 9–14 wake chain (§15–§17 of
`SPRINT17_PHASE0_LONG_HORIZON_WORLD_EVOLUTION_ARCHITECTURE.md`): `lastActiveAt` is bumped
**inside** `wakeWorld` itself, before any downstream layer (`wakeWorldWithPopulation` through
`wakeWorldWithEncounterRealization`) persists its own advancement. If the process crashes
after `wakeWorld` returns but before a downstream layer persists, a retry re-enters at
`wakeWorld`, recomputes `ticksElapsed` from the **already-bumped** `lastActiveAt`, and
silently loses however much elapsed time the downstream layers should have applied — "no test
in Sprints 9–14 crashes the process between these two specific calls," per that document's own
§15/§16 finding. Sprint 17 Phase 0's own acceptance matrix names this exactly as scenario E
("Crash during catch-up... must fail against today's unmodified code and pass once §15/§16
land").

This is a hard dependency for Sprint 18's checkpoint/replay guarantee (§9 above) because
canonical-event activation is itself one more downstream-of-`wakeWorld` layer, chained even
further out than encounter realization. Until Sprint 17 fixes the crash window, a crash
between `wakeWorld` returning and `wakeWorldWithCanonicalEvents` (the eventual outermost wake
layer) persisting could cause a `REQUIRED` canonical event's activation window to be silently
skipped on the lost ticks — which would violate Phase 0's own §9 invariant ("must eventually
activate... cannot be starved") in exactly the crash scenario §28/proof C (Replay Safety) is
meant to guard against. **Sprint 18 runtime implementation must not begin until Sprint 17's
fix for this crash window has landed and its regression test (scenario E) passes.**

## 15. Exact implementation tasks to execute immediately after Sprint 17 closes

1. Re-verify this document's §8 (Sprint 16 spatial reconciliation) and §14 (Sprint 17
   dependency) against Sprint 17's actual closing commit — the crash-recovery fix may change
   which function bumps `lastActiveAt` and therefore where canonical-event wake wiring attaches.
2. Create `packages/canonical-event-contracts` (types only): `CanonicalEventIdentity`,
   `CanonicalEventEligibility`, `CanonicalEventActivationCondition`, `MandatedFact`,
   `CanonicalEventProjection`, `CanonicalEventProjectionScope` (§8, now using real
   `DomainId`/`SectorId`/`QuadrantId`/`PatchId`/`LocalPlaceId` from `@avatark/spatial-ecology-
   contracts`), `WorldInstanceCanonicalProjectionState`, `VisitorCanonicalEventWitness`,
   `CanonicalEventProvenance`.
3. Add the new artifact kind (`*.canonical-events.json`) and extend
   `manifest.json`'s type-guard in `artifactIngestion.ts` — no other change to that file.
4. Create `packages/canonical-event-runtime`: `deriveCanonicalActivationId` (§3, pre-check-
   then-work, `append`-with-`duplicate_ignored` return shape matching
   `TerritoryClaimRepository.append`), eligibility evaluation, activation state machine (Phase
   0 §7/§8).
5. Extend `WorldCheckpoint` (`packages/world-persistence-contracts/src/checkpoint.ts`) with
   `canonicalProjectionHistory: activationId[]`; extend `recoverAuthoritativeState`
   (`packages/world-persistence-runtime/src/checkpoint.ts`) to skip already-completed
   activation ids on replay (§9).
6. Create `lib/canonicalEvents/hostService.ts`: `wakeWorldWithCanonicalEvents` composing
   `wakeWorldWithSpatialEcology` (the current outermost wake function,
   `lib/spatialEcology/hostService.ts`) exactly as every prior sprint has extended the one
   before it — never a parallel wake path. Wires mandated facts into
   `wakeWorldWithEncounterRealization`'s inputs (§6) and produces `WorldEvent`s via the
   existing `deriveWorldEvents` pipeline (§7).
7. Author one `AdaptationRule` reacting to `CANONICAL_EVENT_OCCURRED` `WorldEvent`s and
   emitting a `PLACE`-domain `AdaptationEffect`, reusing `resolvePlaceEffectLocationId`
   (`packages/spatial-ecology-runtime/src/adaptationEffectLocation.ts`) for location keying
   (§8) — proves the spatial-consequence seam without any new spatial write path.
8. Extend `dependencyBoundaries.test.ts` (§5) with the three-subject regex scan:
   `protectedNarrative\w*\.`, `canonicalEventDefinition\w*\.`,
   `spatialEcologyRepositor\w*\.` against `(save|put|set|write|mutate|update)\(`.
9. Implement acceptance proofs A–C (single-instance: Canon Immutability, Authorized
   Projection, Replay Safety) against the real `WorldCheckpoint` extension from task 5,
   including Sprint 17's scenario-E-style crash-window regression test adapted to the
   canonical-event layer specifically.
10. Implement acceptance proofs D–E (Visitor Absence, multi-instance divergence) — depends on
    task 9's infrastructure, per Phase 0's own §29 sequencing.
11. Implement Vrindavan proof (§12 above) as a real Host-layer test
    (`lib/canonicalEvents/hostService.test.ts`, matching `lib/spatialEcology/hostService.test.ts`
    precedent) and Living Forest proof (§13 above) as a `canonical-event-runtime` package test
    (matching `livingForestSpatialEcologyPortability.test.ts` precedent).
12. Run full regression (`pnpm test`, `tsc --noEmit`, targeted `eslint`) — expect
    1497 + new test count, zero regressions, matching Sprint 16's own §20 bar exactly.

---

## Acceptance Scenarios

**Canonical event occurs exactly once.** Given a fresh world instance and an eligible
`canonical-event-govardhan-lifting`, when `wakeWorldWithCanonicalEvents` is called once, then
`WorldInstanceCanonicalProjectionState.status` reaches `COMPLETED` exactly once, exactly one
`WorldEvent` with `category: "CANONICAL_EVENT_OCCURRED"` and that `activationId`'s
`causalReferences` exists, and `canonicalProjectionHistory` on the resulting checkpoint
contains exactly one entry for that `activationId`.

**Retry cannot duplicate consequence.** Given the world instance from the prior scenario at
the same tick, when `wakeWorldWithCanonicalEvents` is called a second time with identical
inputs (simulating a client retry), then `deriveCanonicalActivationId` recomputes the
identical `activationId`, the append returns `duplicate_ignored`, and both the `WorldEvent`
count and any downstream `PLACE`-domain `AdaptationEffect` count are unchanged from the first
call — asserted by exact count, not merely "no crash."

**Protected Canon cannot be mutated.** Given any activation attempt, when
`canonical-event-runtime` code is scanned by the extended `dependencyBoundaries.test.ts`
(task 8), then zero matches exist for `canonicalEventDefinition\w*\.(save|put|set|write|
mutate|update)\(` across every runtime package, and `CanonicalEventDefinition`'s TypeScript
interface exposes no such method to attempt a call against in the first place.

**Event can legitimately affect permitted world state.** Given a mandated fact
`{ kind: "PARTICIPANT_PRESENT", participantRef: "cow-herd-1" }` for
`canonical-event-govardhan-lifting`, when the projection completes, then the cow herd's
presence is consulted as an input to `resolveEncounterRealization` for that location/tick
(§6) and a resulting `EncounterConsequence` is derived through the existing, unmodified closed
union — never a new `"CANONICAL"` domain branch.

**Event can affect Sprint 16 spatial/ecological state.** Given the Vrindavan proof scenario
(§12), when the authored `AdaptationRule` reacts to the `CANONICAL_EVENT_OCCURRED` `WorldEvent`
and persists a `PLACE`/`ENCOUNTER_ELIGIBILITY` effect scoped to `govardhan-path`, then
`getSpatialSnapshot(worldInstanceId)` returns `patch-govardhan-path.ecologicalPressure === 1`
while `patch-vrindavan-entry`, `patch-yamuna`, and `patch-kadamba-grove` all remain `0`.

**Deterministic checkpoint/replay.** Given a world instance woken twice at the identical tick
with the identical eligible canonical event and identical seed, when both
`WorldInstanceCanonicalProjectionState` results and `canonicalProjectionHistory` are compared,
then they are deep-equal, matching the exact assertion style
`lib/encounterRealization/hostService.test.ts`'s own replay test already uses ("2 events not
4," not just "no crash").

**Two worldInstanceIds remain isolated.** Given two instances (`world-18-multi-a`,
`world-18-multi-b`) sharing the identical Canon and grammar, when
`canonical-event-govardhan-lifting` is activated only in instance A, then instance B's
`WorldInstanceCanonicalProjectionState` remains `DORMANT`/`ELIGIBLE` (never `COMPLETED`), and
`getSpatialSnapshot` shows `ecologicalPressure = 1` for A's `patch-govardhan-path` and `0` for
B's — the same disjoint-set proof shape as Sprint 16's own §17 multi-instance test, re-run one
layer up.

**Vrindavan proof.** As specified in §12 above — a real, Canon-scoped scenario grounded in
`VRINDAVAN_SPATIAL_GRAMMAR`'s actual 4 Patches, no invented sub-geography.

**Living Forest proof.** As specified in §13 above — the identical `canonical-event-runtime`
functions run against a non-Vrindavan, programmatically-built grammar, with an inspection-based
assertion (matching Sprint 16 §15/§18's method) that zero Vrindavan-specific identifier appears
in `canonical-event-contracts`/`canonical-event-runtime`.

**Renderer-neutral proof.** Given the completed Vrindavan projection from §12, when its
mandated facts and resulting `WorldEvent`/`AdaptationEffect` are inspected, then no field,
type, or produced value anywhere in the chain references `Actor`, `UObject`, `Blueprint`,
`React`, `DOM`, or `CSS` — verified the same way Sprint 16 §18 verified its own chain, by
direct source inspection, not by trusting a docstring.

---

SPRINT 18 IMPLEMENTATION PREP READY — WAITING FOR SPRINT 17 CLOSURE
