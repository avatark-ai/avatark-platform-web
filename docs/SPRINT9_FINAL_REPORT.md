# Sprint 9 — Persistent World at Scale: Final Report

**As of:** 2026-08-08. Branch `feature/sprint9-persistent-world`, branched
from `feature/sprint8-world-embodiment` @ `67b0a09`. Not merged to RC3
(explicitly instructed not to). Verify against `git log` before trusting
anything below.

## 1. Repos/branches/commits

Single repo touched: `avatark-platform-web`. Branch
`feature/sprint9-persistent-world`, stacked on `feature/sprint8-world-embodiment`
exactly as Sprint 6→7→8 stacked on each other — unmerged, by design, per
the mission's own instruction not to touch RC3. No StudioK repo (canon/
specifications/platform) was touched — Sprint 9 needed no new StudioK
content; it reused Vasanta/Grīṣma (already-Approved STK-CAN-006) and
invented no new season/location/entity/narrative vocabulary anywhere.

## 2. Persistence package/module inventory

- `packages/world-persistence-contracts` — ids, `DurableWorldState`,
  `WorldCheckpoint`, `WorldSystemEventRecord`, `WorldDefinition`/
  `WorldInstance`, `ConditionalSaveResult`, `WorldLease`, lifecycle types,
  8 named failure classes, `WorldOperationalTelemetry`. Zero
  implementations. Depends only on `@avatark/runtime-contracts` and
  `@avatark/living-systems-contracts` (statically enforced, see §26).
- `packages/world-persistence-runtime` — `computeDeterministicCatchUp`
  (wraps Sprint 7's own `advanceWorldSimulation` unmodified),
  `createCheckpoint`/`recoverAuthoritativeState`, `nextLifecycleState`/
  `resourceTier`, `fixedRateTickPolicy`, and reference in-memory adapters
  for every new repository interface. 38 tests, all passing.
- `lib/worldPersistence/` (Host layer, additive) — `singleton.ts` (new,
  separate module-scoped durable repos — does NOT touch or wrap Sprint
  7's own `lib/livingSystems/singleton.ts`), `durableState.ts`
  (seed/load), `durableSnapshot.ts` (durable-sourced `WorldSnapshot`/
  `WorldEmbodimentSnapshot` resolution, reusing Sprint 7/8's pure
  functions unmodified), `hostService.ts` (`WorldHostService`: 
  `getWorldState`/`wakeWorld`/`advanceWorld`/`getWorldSnapshot`/
  `getEmbodimentSnapshot`/`interact`). 3 new dev-only API routes under
  `app/api/dev/account/living-vrindavan/persistence/`.
- `supabase/migrations/026_living_systems_world_state.sql` — prepared,
  unapplied schema (§22).

## 3. World definition vs world instance model

`WorldDefinitionId`/`WorldInstanceId`/`WorldVersion` now exist
(`packages/world-persistence-contracts/src/ids.ts`,
`worldInstance.ts`). `WorldInstanceId` is deliberately the *same* string
space every existing Living Systems/Embodiment function already
addresses as `WorldId` — no signature in
`@avatark/living-systems-runtime` or `@avatark/world-embodiment-runtime`
changed. `WorldInstanceRepository` supports many instances per
definition (proven in `multiVisitorMultiInstance.test.ts`'s "two
instances / one definition" test) without deciding whether AvatarK
ultimately runs one global Vrindavan or many — that policy question is
untouched, as instructed.

## 4. Durable shared-world-state model

`DurableWorldState { worldInstanceId, stateVersion, sharedState,
entities, updatedAt }` — `SharedWorldState` and `LivingEntityState` stay
Sprint 7's own unmodified types (Architectural Law #1/#2), persisted
together in one conditional-save because `advanceWorldSimulation`
already advances them together, one tick at a time, by Sprint 7's own
design. `stateVersion` is the optimistic-concurrency guard (§13).

## 5. Entity persistence model

Same `LivingEntityState` type as Sprint 7, carried inside
`DurableWorldState.entities` rather than a separate table-equivalent —
a deliberate choice (documented in `durableWorldState.ts`'s own comment)
to avoid the exact race a split write would reintroduce, while keeping
the *type* independently addressable, per Architectural Law.

## 6. Visitor-memory persistence model

Not redefined. Sprint 7's own `VisitorWorldMemory`/
`VisitorWorldMemoryRepository` (get-only-by-userId+worldId, no cross-user
read method) is reused unchanged, re-exported from
`world-persistence-contracts`'s own index for a single import surface.
Proven isolated in `multiVisitorMultiInstance.test.ts`.

## 7. Protected-narrative persistence/read boundary

Not redefined, no new table. Sprint 7's `ProtectedNarrativeStateRepository`
(get-only, no `save` method on the interface at all) is reused unchanged.
`recovery.test.ts` and `recoveryEmbodiment.test.ts` both confirm it is
untouched by wake/catch-up/recovery. A static dependency-boundary test
(`dependencyBoundaries.test.ts`) confirms `world-persistence-runtime`
never calls a write method on it, mirroring the same defense-in-depth
check Sprint 7 already applied to `living-systems-runtime`.

## 8. WorldSystemEvent model

`WorldSystemEventRecord extends WorldSystemEvent` (Sprint 7's own type,
untouched) `+ { eventId, worldInstanceId, sequence }`. `eventId` is
content-derived (sha256 of worldInstanceId+tick+type+detail+position),
not random — a retried append of the exact same deterministic catch-up
call reproduces the same id, so `DurableWorldSystemEventRepository.append`
dedupes correctly (proven in `catchUp.test.ts` and
`inMemoryDurableRepositories.test.ts`). Still explicitly distinct from
`@avatark/experience-registry`'s visitor-scoped events — nothing changed
about that Sprint 7 boundary.

## 9. Checkpoint model

`WorldCheckpoint` carries the *full* `sharedState`+`entities` as of its
own `tick`, never a delta, plus `eventSequenceAsOf` (the last durable
event sequence already reflected in it) and a `reason` (`periodic` |
`dormancy` | `manual` | `recovery`). Saved via an idempotent upsert keyed
by `id`. `createCheckpoint`/`WorldCheckpointRepository` in
`world-persistence-runtime`.

## 10. Deterministic catch-up result

`computeDeterministicCatchUp` is a thin wrapper around Sprint 7's own
`advanceWorldSimulation` — no second simulation engine was written.
`catchUp.test.ts` proves, byte-for-byte, that one dormant catch-up call
of N ticks equals N active single-tick calls, and that Vasanta→Grīṣma
still transitions correctly through the durable path. **Result: PASSED.**

## 11. Active/dormant lifecycle result

`DORMANT → WAKING → ACTIVE → QUIESCING → DORMANT` implemented as a pure,
closed transition table (`nextLifecycleState`) returning `null` for
illegal transitions rather than silently no-op-ing.
`hostService.wakeWorld` drives `DORMANT→WAKING→ACTIVE` for real, backed
by the lease + durable-state repos. **Result: PASSED**
(`lifecycle.test.ts`, `hostService.test.ts`).

## 12. HOT/WARM/COLD model

`resourceTier(lifecycleState)` is a pure, derived mapping
(`DORMANT→COLD`, `WAKING/QUIESCING→WARM`, `ACTIVE→HOT`) — never a second
stored field that could drift from lifecycle state. **Result: PASSED**
(`lifecycle.test.ts`).

## 13. Concurrency/versioning result

`InMemoryDurableWorldStateRepository.conditionalSave` enforces
expected-version-must-match-current-or-be-null-for-first-write; a stale
writer's call resolves to a `{status:"conflict", currentVersion,
currentState}` result and *never* overwrites what a faster writer
produced — proven with an explicit two-writer race in
`inMemoryDurableRepositories.test.ts`. **Result: PASSED, stale writer
rejected.**

## 14. World ownership/lease model

`WorldLease{worldInstanceId, ownerId, leaseVersion, acquiredAt,
expiresAt}` + `InMemoryWorldLeaseRepository` (acquire/renew/release,
expiry-based reclaim, idempotent release). No Kubernetes/Redis/Kafka/
vendor lock service — a reference in-process adapter proving the
*contract*, swappable later for a real backing store behind the same
interface. **Result: PASSED** — second owner rejected while a lease is
held (`leaseRepository.test.ts`, `hostService.test.ts`), reclaimable
after expiry.

## 15. Crash-recovery result

The Phase 8 reference scenario (Vasanta start → advance → checkpoint →
more events → "process destroyed" → new runtime → checkpoint+history
loaded → state reconstructed → encounter availability + visitor memory +
protected narrative verified) is implemented verbatim in
`recovery.test.ts`, using only the checkpoint and event repositories as
survivors (exactly what a real deployment's durable storage would be).
Recovered state is `deepEqual` to what continuing to advance directly
would have produced. **Result: PASSED.**

## 16. Idempotency result

Verified for: checkpoint writes (upsert by id), event append (dedupe by
content-derived eventId, `duplicate_ignored` status), world-instance
creation (create-twice returns the original), lease release
(already-released is a no-op), and catch-up itself (retrying the same
call reproduces identical event ids). **Result: PASSED** across all five
surfaces tested.

## 17. Multi-visitor consistency result

Two visitors reading the same `DurableWorldState` see `deepEqual` world
truth; their `VisitorWorldMemory` rows are independent and never
cross-read (`multiVisitorMultiInstance.test.ts`). **Result: PASSED.**

## 18. Multi-instance independence result

Two `WorldInstanceId`s derived from the same season/archetype
definitions advance completely independently — different tick counts,
different seasons, independent `stateVersion` numbering (starts at 1 for
each, not a shared counter). **Result: PASSED.**

## 19. Embodiment continuity result

`lib/worldPersistence/durableSnapshot.ts` calls Sprint 7/8's own
`resolveWorldSnapshot`/`resolveWorldEmbodiment` unmodified, sourcing
state from the durable repos instead of Sprint 7's in-memory singleton.
`recoveryEmbodiment.test.ts` proves a *recovered* state (via
`recoverAuthoritativeState`) flows through that exact same chain into a
valid `WorldEmbodimentSnapshot` with zero renderer-specific state
invented inside persistence. **Result: PASSED.**

## 20. Unreal-boundary result

No Unreal type, class, or token appears anywhere in
`world-persistence-contracts`/`world-persistence-runtime` — statically
enforced by an extension of the existing
`lib/runtimeKernel/dependencyBoundaries.test.ts` forbidden-token check
(same list Sprint 8 already used: `UObject`, `AActor`, `Blueprint`,
`UnrealEngine`, plus React/Next.js tokens). Sprint 8's headless command
translator (`translateToUnrealCommands`) was not touched. **Result:
PASSED.**

## 21. Living Forest portability result

`livingForestPortability.test.ts` runs the exact same fictional
"living-forest-fixture" pattern Sprint 7's own `otherWorldGrammar.test.ts`
established, through catch-up, checkpoint+recovery, lease acquisition,
and lifecycle transition — no code in any of those four modules mentions
"forest" or "vrindavan." **Result: PASSED, no core changes required.**

## 22. Actual database/migration status

**Nothing was applied.** No credentials exist in this environment to
safely exercise a real Postgres backend, matching every prior sprint's
own documented limitation. What *was* prepared:
`supabase/migrations/026_living_systems_world_state.sql` — 8 tables
(`world_instances`, `durable_world_shared_state`, `living_entity_state`,
`world_checkpoints`, `world_system_events`, `world_leases`,
`world_lifecycle`, `visitor_world_memory`), RLS on every table (read-only
for authenticated users on world-truth tables — writes are service-role
only, extending migration 023's "no update/delete policy" idiom to *all*
client writes; owner-only full-CRUD on `visitor_world_memory`, matching
migration 025's convention). Registered in
`supabase/scripts/run-platform-migrations.js`'s `MIGRATION_ORDER` for
traceability only, exactly as migration 023 already was — **the
migration script itself was never run.**

## 23. Performance measurements (this environment only, `scripts/sprint9-performance.ts`)

```
catch-up      10 ticks: ~1-3ms,   3 events produced (~257 bytes/event avg)
catch-up    1000 ticks: ~6-7ms,   3 events produced
catch-up  100000 ticks: ~138-150ms, 3 events produced
checkpoint (1 entity): 751 bytes serialized
recovery replaying     10 ticks-worth of events: ~0.3ms
recovery replaying   1000 ticks-worth of events: ~2.2-2.5ms
recovery replaying  10000 ticks-worth of events: ~13-17ms
WorldSnapshot (1 entity, 0 encounter rules): 889 bytes serialized
WorldEmbodimentSnapshot (1 region, 1 entity): 1243 bytes serialized
EmbodimentDelta across one season transition: 158 bytes (2 entries) -- 13% of full-snapshot size
```

Scaling dimensions (reasoned from code structure, not separately
measured): catch-up/recovery time scale linearly with ticks/events
replayed and with entity count per instance; checkpoint size scales with
entity count only (never with tick count or history length); event
volume scales with world-system *transitions*, not ticks (most ticks
emit nothing); snapshot/embodiment size scales with entities +
encounter rules at the current location and reachable-location count;
world-instance count scales horizontally with zero shared mutable state
between instances in the reference adapters (proven, not assumed, by
§18).

## 24. Unit/integration test results

**1051/1051 passing** (996 Sprint 5-8 baseline + 55 new/extended Sprint
9 tests across `world-persistence-contracts` (2),
`world-persistence-runtime` (38), `lib/worldPersistence` (10), and
extensions to `lib/runtimeKernel/dependencyBoundaries.test.ts` (+7 for
the new packages' boundary enforcement — net count varies slightly by
how node:test's own runner buckets shared-file suites; the important
number is 0 failures). `npm run typecheck` and `npm run lint` both clean
against every new file (the 7 pre-existing lint errors/6 warnings in
`npm run lint`'s output all live in files Sprint 9 never touched —
verified by grep).

## 25. Playwright results

**None run this sprint, and none added.** Sprint 9 introduced zero
renderer-facing UI surface — the mission's own guardrails explicitly
forbid redesigning AvatarK UI, and every new capability is reachable
only through `WorldHostService`/dev-only JSON routes, not through
`LivingWorldDetailView` or any other existing component. Sprint 8's own
62/62 Playwright baseline is therefore still the relevant, unmodified
coverage; nothing in this sprint's diff touches a file that baseline
exercises.

## 26. Architectural invariant results

All 20 invariants hold; the ones with dedicated new proof this sprint:

- **#7-8, #14-15** (WorldSystemEvent vs ExperienceRegistry; definition vs
  instance; persistence renderer/Unreal-neutral) — statically enforced,
  `dependencyBoundaries.test.ts`.
- **#9-10, #12-13** (dormancy preserves continuity; catch-up
  deterministic; renderer frame rate irrelevant; stale writers rejected)
  — `catchUp.test.ts`, `recovery.test.ts`, `inMemoryDurableRepositories.test.ts`.
  Renderer frame rate specifically: nothing in the new persistence layer
  reads a clock tied to rendering — `computeDeterministicCatchUp` takes
  an explicit `ticks: number`, never a frame delta.
- **#17-18** (multi-visitor share truth, not memory; multi-instance
  independence) — `multiVisitorMultiInstance.test.ts`.
- **#16** (recovery reproduces authoritative state) — `recovery.test.ts`,
  byte-for-byte `deepEqual`.
- Renderer never owns simulation state (#2) and stays downstream of
  Living Systems (#3): `hostService.test.ts`'s explicit "interact never
  mutates durable state" test.

## 27. Remaining technical debt

1. `findTransitionAffordance` (Sprint 5) is keyed by the literal string
   `"living-vrindavan"` internally — calling
   `resolveDurableWorldEmbodimentSnapshot` for a *second* world instance
   (e.g. `"living-vrindavan-instance-b"`) silently returns `null`
   affordances rather than an error. Harmless (affordance is optional
   metadata) but worth a real fix if multi-instance Vrindavan becomes a
   real product feature, not just a proof in tests.
2. `resolveDurableWorldEmbodimentSnapshot` requires the caller to supply
   `reachableLocationIds` explicitly, rather than deriving them the way
   `lib/worldEmbodiment/embodimentOrchestrator.ts` does from
   `WorldRuntime.getState(...).visitedLocationIds` — a deliberate
   decision to keep Living World Runtime's per-visitor progress domain
   separate from Sprint 9's persistence domain (Phase 0's own "don't
   move responsibilities"), but it means a real caller (a future route)
   still needs to fetch that list itself before calling this function.
3. The reference tick policy (`fixedRateTickPolicy`, 1 tick/ms in
   `hostService.ts`'s `DEFAULT_TICK_POLICY`) is tuned only for this
   environment's own tests to complete quickly — real wall-clock pacing
   (e.g. "1 tick per real hour") is a product decision nobody has made
   yet, correctly left as a swappable `TickPolicy` rather than hardcoded
   into `computeDeterministicCatchUp`.
4. `world_system_events`' `sequence` column in the prepared (unapplied)
   migration notes that a real adapter needs a per-`world_instance_id`
   transactional sequence assignment (e.g. `SELECT MAX... FOR UPDATE`) —
   this was documented, not implemented, since no real adapter exists to
   implement it against yet.
5. Same in-memory/no-Postgres limitation every sprint since Sprint 4 has
   carried, now also true of every Sprint 9 durable-layer singleton:
   state resets on process restart in this environment. The point of
   Sprint 9 was the *contract* and a working *reference* adapter proving
   it end-to-end — not standing up real infrastructure nobody has
   credentials for here.

## 28. Blockers

None encountered. No genuine Canon/governance decision was needed (no
new StudioK content), no irreversible infrastructure action was taken,
no credentials were required beyond what was already absent (and
therefore not attempted), and no material conflict with the Sprint 5-8
foundation arose — Sprint 9 is purely additive alongside it.

## 29. Recommendation for Sprint 10

Given Sprint 9 closes with a working contract + reference adapter but
zero real durable infrastructure exercised, the most direct next step is
either (a) a real Postgres-backed implementation of the seven repository
interfaces against `026_living_systems_world_state.sql` once credentials
exist, exercised against the exact same test matrix this sprint already
wrote (the tests are adapter-agnostic — they'd need only a different
repository construction), or (b) extending the World Instance model
(§3) into an actual multi-instance product surface (e.g. cohort
Vrindavans) now that the runtime can represent it, fixing debt item #1
along the way. Ask before assuming which — same posture Sprint 8's own
handoff took.
