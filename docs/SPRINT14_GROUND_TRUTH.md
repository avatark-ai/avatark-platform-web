# Sprint 14, Phase 0 — Ground Truth / Reconciliation Report

Branch `feature/sprint14-encounter-realization`, off
`feature/sprint13-living-rhythms` @ `a7cfe35`. Written after Phase 0's
own inventory, before any Sprint 14 code (this doc's own reconciliation
section is that inventory's result).

## Reconciliation: the encounter-mechanism debt (Sprint 11 §24 / Sprint
## 12 §24 / Sprint 13 technical debt #2), resolved

There are NOT two competing "encounter engines" needing a merge or a
rewrite. Direct inspection of every encounter-related file in Sprints
5-13 found three legitimate, already-correctly-layered mechanisms plus
one genuinely disconnected legacy path:

1. **POTENTIAL layer — Sprint 7's `resolveAvailableEncounters`**
   (`packages/living-systems-runtime/src/encounterResolution.ts`) ->
   `AvailableEncounter{ruleId, locationId, category}`. Declarative:
   filters StudioK-authored `EncounterRule[]` by location, environment
   band, and the protected-narrative gate. Pure, deterministic,
   unmodified since Sprint 7. **Untouched.**
2. **AVAILABLE layer — Sprint 10's `computeEncounterOpportunities`**
   (`packages/living-population-runtime/src/populationSimulation.ts:109`)
   -> `EncounterOpportunity{ruleId, locationId, category,
   contributingEntityIds, tick}`. Adds population presence on top of an
   already-resolved `AvailableEncounter`. World-instance/tick-scoped via
   the existing `wakeWorld`/`advanceWorld` chain. **Untouched.**
3. **HISTORY/LIFECYCLE layer — Sprint 11's
   `trackEncounterHistory`/`EncounterHistoryEntry`**
   (`packages/world-memory-runtime/src/encounterHistory.ts`). Already
   tracks `AVAILABLE`/`NO_LONGER_AVAILABLE` transitions, driven inside
   `lib/worldMemory/hostService.ts`'s `wakeWorldWithMemory`
   (lines 141-142). `recordEncounterResolved` (same file) already built
   the right `RESOLVED`-status shape but was dead code -- called from
   nowhere in `lib/`. **This is the exact seam Sprint 14 plugs into** --
   `recordEncounterResolved` is finally called this sprint, from
   `lib/encounterRealization/hostService.ts`.
4. **Legacy, deliberately OUT OF SCOPE — the `select-encounter`
   InteractionIntent** (`lib/worldEmbodiment/intentDispatcher.ts`,
   `dispatch()`, `case "select-encounter"`). Checks Sprint 7's
   environment-only `AvailableEncounter` via `resolveLivingSystemsSnapshot`
   -- not world-instance-scoped (never touches `worldInstanceId`), not
   population-aware, and by its own original design only ever
   *acknowledges* availability, never mutates. `lib/worldPersistence/hostService.ts`'s
   `interact()` passthrough (line 155) literally discards its own
   `_worldInstanceId` parameter, confirming this path predates world
   persistence (Sprint 9) and was never migrated.

   **Decision: left completely untouched.** Rewiring it to be
   world-instance-aware would be a materially larger, riskier refactor
   of the visitor-facing intent/route layer than this sprint's mission
   requires, and it was never actually unsafe -- it already never
   mutates or "decides" anything, it just never fed back into
   persistent world history, a smaller, separate, now-honestly-named
   gap. The mission's own architecture diagram (`Living World -> ... ->
   Encounter Realization`) is unambiguously about the PERSISTENT
   simulation (`wakeWorld`/`advanceWorld`), never a visitor's UI intent
   -- confirming layers 2-3 above are where realization belongs. This
   gives the debt an honest disposition: REALIZATION for the persistent
   world lifecycle is resolved THIS sprint; the legacy visitor-intent
   path remains a separate, smaller, consciously-deferred
   product-integration item.

## What `EncounterRecord` is, and is not

`EncounterRecord` (`packages/encounter-realization-contracts`) is a NEW,
finer grain than either prior encounter type -- it does not replace
`EncounterOpportunity` (still the AVAILABLE snapshot, unmodified) or
`EncounterHistoryEntry` (still the coarse per-(ruleId,locationId)
breadcrumb, unmodified; its own `RESOLVED` status is populated for the
first time this sprint, not superseded). `EncounterRecord` is the
per-INSTANCE historical truth: one record per actual realization
attempt, with a real content-derived id, participant/group lists,
causal provenance, and consequence references -- the materially richer
grain the mission's own "Encounter Opportunity != Encounter Realization"
distinction requires.

`EncounterRealizationStatus` = `REALIZING | REALIZED |
CONSEQUENCES_APPLIED | REMEMBERED | EXPIRED | BLOCKED | SUPERSEDED`.
`REALIZING` is transient/within-wake in the reference resolver --
resolution is synchronous, so no record is ever left dangling in
`REALIZING` between wakes in normal operation. `SUPERSEDED` is modeled
in the type but not exercised by the reference resolver this sprint
(reserved vocabulary for a future cross-wake-pending scenario, the same
"prove the mechanism, not exhaust the design space" posture Sprint 13's
own technical debt #1 already used for `SocialInteractionCategory`'s
`follow`/`gather`/`avoid`). `REMEMBERED` is likewise reserved -- this
reference implementation's own World Memory/Entity Memory consequences
already make an encounter "remembered" functionally the moment
`CONSEQUENCES_APPLIED` is reached, so no code path sets this status
explicitly; a future sprint with a genuinely separate "has a visitor
discovered this" concept can use it without a type change.

## Realization algorithm

`resolveEncounterRealization` (`packages/encounter-realization-runtime`)
is pure and deterministic. A hard gate (protected-narrative unresolved
-> `BLOCKED`) runs first, re-checking the SAME rule Sprint 7's own
`resolveAvailableEncounters` already enforces (defense in depth). Then
a small, bounded, weighted causal score combines: routine compatibility
(are the still-present contributing entities' current activities
stationary/engaging, not movement-shaped -- weight 0.5), group cohesion
(weight 0.2), relationship band bias (WEAK 0.05 / ESTABLISHED 0.12 /
STRONG 0.2), and a coarse resource-opportunity-available bonus (0.15).
Score >= 0.6 -> `REALIZED`; score < 0.25 -> `EXPIRED`; the bounded
ambiguity band between them is resolved by
`deriveDeterministicVariation` (Sprint 7's own existing helper,
`@avatark/living-systems-contracts`) proportionally to how strong the
partial signal already is -- variation resolves ambiguity, it never
replaces causality (the mission's own explicit distinction, proven by
`encounterRealizationResolution.test.ts`'s own bounded-ambiguity test).

`resourceOpportunityAvailable` is deliberately coarse -- "does this
place currently afford anything at all" -- rather than a precise
`EncounterCategory -> ResourceTag` mapping, which no existing contract
defines. A future sprint that wants category-specific resource gating
can refine this without a resolver-shape change.

## Why `encounter-realization-runtime` re-implements a tiny id-deriver
## instead of importing `deriveMemoryRecordId`

`lib/runtimeKernel/dependencyBoundaries.test.ts`'s own established
discipline forbids any `*-runtime` package depending on a sibling
runtime package (only contracts packages may be shared) -- confirmed by
reading every existing boundary-test title before writing a line of
Sprint 14 code. `deriveEncounterRecordId`
(`packages/encounter-realization-runtime/src/encounterIdentity.ts`) is a
deliberate, documented restatement of `world-memory-runtime`'s own
`deriveMemoryRecordId` -- the same "second, independent implementation
of a similar rule" posture Sprint 13's own `resolveResourceOpportunities`
already used for `perception.ts`'s gate.

## Consequence model

`EncounterConsequence` (`packages/encounter-realization-contracts`) is a
closed, two-domain union -- no psychology, no moral score, no
engagement/reputation field:

- `WORLD_MEMORY`: forwards a plain, EXISTING `WorldConsequence`
  (`world-memory-contracts`, unchanged) into the SAME `deriveWorldEvents`
  pipeline every consequence in this domain already flows through.
  `deriveConsequences` (`encounter-realization-runtime`) attaches one
  `RESOURCE_PREFERENCE` per participant (bias their future destination
  back to this location, through Sprint 11's own already-existing
  `resolvePreferredResourceLocation` -> `memoryHint` ->
  `selectBehavior` bridge -- zero new "future behavior" mechanism) and
  one `LOCATION_HISTORY_MARKER` for the place.
- `RELATIONSHIP`: names an existing `RelationshipId` and asks Social
  Ecology's own Host layer's new, additive `applyEncounterEvidence`
  (`lib/socialEcology/hostService.ts`) to record one unit of
  encounter-evidence -- never a parallel relationship graph.

**Entity-need/routine-intent/movement-intent consequences are
deliberately NOT a direct write this sprint.** Sprint 10's own
`EntityBehaviorState` (needs, movement, activity) has exactly one
writer, the population tick loop itself
(`packages/living-population-runtime/src/populationSimulation.ts`) --
reaching in from outside would create a second needs-mutation
authority, exactly what every prior sprint's own ground-truth document
warns against. "Changed future behavior" for an entity is instead
expressed the same way Sprint 11 already expresses it: a
`RESOURCE_PREFERENCE` consequence read back in on a LATER tick, never a
same-tick direct mutation.

`RelationshipEvidence` gained an additive, OPTIONAL `encounterCount`
field (`social-ecology-contracts`), weighted x3 in `deriveRelationshipBand`
(same weight as `reunionCount`) -- `evolveRelationshipEvidence` only
ever includes the key in its return value once a real encounter has
touched the relationship, keeping the function's return shape
byte-identical for every pre-Sprint-14 caller (Sprint 12/13's own tests
assert on the literal object shape, not just the derived band).

## Realization/consequence application boundary

Three textually separate functions, per the mission's own explicit
requirement:

- `resolveEncounterRealization` -- pure, `encounter-realization-runtime`.
- `deriveConsequences` -- pure, `encounter-realization-runtime`.
- Consequence APPLICATION happens at the Host layer
  (`lib/encounterRealization/hostService.ts`), never inside a runtime
  package -- the same posture `living-rhythms-runtime`/
  `social-ecology-runtime` already hold (pure derivation in the
  package, real repository writes only in `lib/*/hostService.ts`).
  `applyConsequences` is not a single function name here; it is this
  file's own dispatch over `EncounterConsequence[]` -- `WORLD_MEMORY`
  consequences flow into the SAME `deriveWorldEvents`/
  `deriveEntityMemoryEntries`/`worldEventRepository.append`/
  `entityMemoryRepository.append` pipeline every prior sprint's own
  consequence already used; `RELATIONSHIP` consequences call
  `lib/socialEcology/hostService.ts`'s own new `applyEncounterEvidence`
  -- never a direct write into `relationshipRepository` from this new
  module, preserving Social Ecology's own sole-writer boundary (the
  same discipline Sprint 13 held for `GroupState`).

## Idempotency / replay

`EncounterRecord.id` is content-derived
(`deriveEncounterRecordId(worldId, ruleId, locationId,
participantEntityIds, tick)`, order-independent over participants).
`lib/encounterRealization/hostService.ts`'s own wake loop looks up this
id in `encounterRecordRepository` BEFORE doing any work; if it already
exists (a replayed wake recomputing the identical tick range), the
existing record is returned unchanged and NOTHING is
re-derived/re-applied. This is the ENTIRE idempotency mechanism --
`applyEncounterEvidence` itself carries no separate guard, because the
Host-layer id-gate already guarantees it is called at most once per
real encounter. Proven empirically (`lib/encounterRealization/hostService.test.ts`'s
own "waking twice" test): identical ids, identical full record arrays,
exactly one `ENCOUNTER_RESOLVED` `WorldEvent` per real encounter (not
two), `RelationshipEvidence.encounterCount` incremented exactly once.

## Host-layer composition

`wakeWorldWithEncounterRealization` composes `wakeWorldWithRhythms`
(Sprint 13's own top-of-stack) as its own base call, then adds a
realization pass over every currently-AVAILABLE `EncounterOpportunity`
-- the same layering discipline every prior sprint's own Host service
already holds. `getEncounterRecords` is a thin Host-composed read; no
caller outside `lib/encounterRealization/hostService.ts` ever imports
`encounterRecordRepository` directly.

## No conflict found

No genuine architectural or canon conflict blocks Sprint 14. The
reconciliation above required a judgment call (leave the legacy
`select-encounter` path untouched) but not a boundary violation --
every write happens through an existing domain's own Host service, no
new mutation authority was created, and Protected Canonical Narrative
gained no write path (re-verified: `encounter-realization-runtime`'s
source contains zero occurrences of `protectedNarrative` in a WRITE
context -- it only ever READS `ProtectedNarrativeProjection.resolved`
to enforce the same gate Sprint 7 already enforces). Proceeding.
