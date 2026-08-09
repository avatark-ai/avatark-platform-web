# Sprint 12 — Social Ecology & Persistent Relationships: Final Report

**As of:** 2026-08-09. Branch `feature/sprint12-social-ecology`, off
`feature/sprint11-world-memory` @ `4228615`. Not merged to RC3, no
database migration applied. Verify against `git log` before trusting
anything below.

## 1. Repo / branch / commit

`avatark-platform-web`, branch `feature/sprint12-social-ecology`. See
commit list below (written just before the final commit).

## 2. Packages/modules created

- `packages/social-ecology-contracts` — `RelationshipId`/`GroupMembershipId`/
  `HomeRangeId`/`SeparationStateId`/`ReunionEventId`, `RelationshipState`/
  `RelationshipType`/`RelationshipBand`/`RelationshipEvidence`,
  `GroupMembership`/`GroupRole`/`GroupMembershipStatus`, `FamiliarityState`/
  `FamiliarityBand`/`FamiliarityEvidence` + `normalizeEntityPair`,
  `HomeRange`/`HomeRangeOwnerType`/`PlaceAttachment`, `SeparationState`/
  `SeparationSubjectType`/`ReunionEvent`, `SocialPerception`,
  `SocialEcologySnapshot`, and five repository interfaces. 2 tests.
- `packages/social-ecology-runtime` — familiarity-band derivation,
  relationship-band derivation, separation/reunion state-transition
  detection (content-derived ids), social-perception resolution, place
  attachment, and five reference in-memory repositories. 41 tests
  (36 unit + 5 alternate-world portability).
- `lib/socialEcology/` (Host layer, additive) — `singleton.ts`,
  `vrindavanSocialDefinition.ts` (parent/offspring relationship +
  group-membership audit + home-range fixture, all built from Sprint
  10's own already-seeded cows/groups), `hostService.ts`
  (`wakeWorldWithSocialEcology`, `getSocialPerception`,
  `getEmbodimentWithSocialEcology`). 7 tests.
- `lib/renderer/webSocialEcologyRenderer.ts` — minimal diagnostic label
  mapping, no prose. 6 tests.
- Small, additive extensions: `BehaviorType`/`MovementIntentType` gained
  `APPROACH_RELATED_ENTITY`/`RETURN_TO_HOME_RANGE` variants
  (`living-population-contracts`); `selectBehavior`/`resolveMovementIntent`/
  `advancePopulationSimulation` gained optional `socialContext`/
  `relatedEntityIdsByEntityId`/`homeRangeLocationIdsByOwnerId` params
  (`living-population-runtime`, 11 new tests); `WorldEventCategory`/
  `EntityMemoryEntryType`/`ReturnRecognitionFactType` gained
  `SEPARATION_OCCURRED`/`REUNION_OCCURRED`/`RECENT_SEPARATION`/
  `RECENT_REUNION`/`social_relationship_changed` (`world-memory-contracts`);
  `evaluateSignificance`/`deriveWorldEvents`/`deriveEntityMemoryEntries`/
  `computeReturnRecognition` gained matching optional inputs/branches
  (`world-memory-runtime`, 9 new tests); `advancePopulationForWorld`/
  `wakeWorldWithPopulation`/`wakeWorldWithMemory` gained the two new
  pass-through params (`lib/livingPopulation/`, `lib/worldMemory/`);
  one new emergent-encounter rule keyed on `REUNION_OCCURRED`
  (`lib/worldMemory/vrindavanMemoryDefinition.ts`).
- `lib/runtimeKernel/dependencyBoundaries.test.ts` — extended with the
  Social Ecology boundary block (6 new tests).
- `supabase/migrations/029_social_ecology.sql` — prepared, unapplied
  schema (5 new tables; documents source-of-truth vs audit-only fields).

## 3. State/memory ownership map

Full map in `docs/SPRINT12_GROUND_TRUTH.md`. Summary: `SharedWorldState`
(Sprint 7), `LivingEntityState`/`EntityBehaviorState` (Sprint 7/10), and
`GroupState` (Sprint 10) are unchanged, exclusively owned by their
existing Host modules — Social Ecology reads `GroupState.memberEntityIds`
by reference and never mutates it. `RelationshipState`/`GroupMembership`/
`FamiliarityState`/`HomeRange`/`SeparationState`/`ReunionEvent` are new,
owned by `lib/socialEcology/`. World Memory/Entity Memory (Sprint 11) are
extended, not replaced — new candidate inputs feed the SAME
`deriveWorldEvents`/`deriveEntityMemoryEntries` functions. Protected
Canonical Narrative remains read-only, get-only, with no write path added
anywhere this sprint (statically re-verified, and this sprint's runtime
package never even references the identifier at all — a stronger form of
the invariant than prior sprints' "no write method call" check).

## 4. Key design decisions

Five genuinely new architectural calls, each documented with its
reasoning in `docs/SPRINT12_GROUND_TRUTH.md`: (1) group membership stays
audit-only this sprint — separation-from-group is detected by comparing
an entity's own location to its group's, never by mutating
`memberEntityIds`; (2) a single generic `SeparationSubjectType` covers
both entity-to-entity and entity-to-group separation, avoiding two
parallel mechanisms; (3) `FamiliarityState` (bounded, evidence-based) and
`RelationshipState` (typed, persistent) stay distinct types per the
mission's own split; (4) no separate `SocialContext` type — folded into
one `SocialPerception`; (5) `SocialConsequence` reuses Sprint 11's
existing `GROUP_HISTORY_RELATIONSHIP` where the shape already fits.

## 5. Relationship model

`RelationshipState{id, worldId, entityAId, entityBId, relationshipType,
band, evidence, establishedTick, lastRelevantTick}`. Four types
(`PARENT_OFFSPRING`/`GROUP_MEMBER`/`FAMILIAR`/`PREFERRED_ASSOCIATE`),
three bands (`WEAK`/`ESTABLISHED`/`STRONG`) derived deterministically
from a weighted evidence score (co-presence + 2×shared-group +
3×reunion). One relationship seeded for Living Vrindavan: the two
already-neutral cows, `PARENT_OFFSPRING` — a Host-layer, non-canonical
pairing, not a franchise relationship.

## 6. Group membership model

`GroupMembership{id, worldId, groupId, entityId, role, status,
establishedTick, leftTick}` — an additive audit/identity record layered
on Sprint 10's own `GroupState.memberEntityIds`, never a second
authority. Seeded once per group at Host-layer `ensureSeeded` time;
static thereafter this sprint (see §4, decision 1).

## 7. Familiarity model

`FamiliarityState{worldId, entityAId, entityBId, band, evidence,
lastUpdatedTick}`, keyed by `normalizeEntityPair` (order-independent).
Three bands (`UNKNOWN`/`SEEN`/`FAMILIAR`) from a simple co-presence +
shared-group total against configurable thresholds. Evolved for every
present-population pair sharing co-presence or group membership on a
given wake, bounded to the live roster — never a growing, unbounded
all-pairs history.

## 8. Territory / home-range model

`HomeRange{id, worldId, ownerType, ownerId, preferredLocationIds,
establishedTick}`. `resolvePlaceAttachment` treats no-home-range and
empty-preference-list identically as "always within range" (the same
honest-default convention Sprint 11's `HistoricalCondition` established).
Seeded per group at its own initial seed location, for both the cow herd
and the bird flock.

## 9. Social perception model

`SocialPerception{entityId, nearbyKnownEntityIds, relationships,
groupMembersPresentIds, groupMembersAbsentIds, familiarEntityIds,
currentGroupLocationId, withinHomeRange, separationActive, groupId}` —
every fact derivable from already-authoritative relationship/group/
familiarity state and current entity locations, never a raycast, never
inferred psychology. Live at `getSocialPerception` (entity-scoped) and
`getEmbodimentWithSocialEcology`'s own `LocationSocialSummary`
(location-scoped, for the visitor who has no `EntityId` of their own).

## 10. Social behavior integration result

**PASSED, bounded and legality-preserving.** `selectBehavior` gained an
optional `socialContext` — `APPROACH_RELATED_ENTITY` and
`RETURN_TO_HOME_RANGE` compete on the SAME utility/priority mechanism
Sprint 10 built, gated on `caps.has("can_move")` and a perception-reachable
target; a target perception never granted is proven silently ignored
(`behaviorSelection.test.ts`, 6 new tests). `advancePopulationSimulation`
recomputes each entity's own related-entity location and home-range
status fresh every tick from live population/group state (never
precomputed once, unlike the per-interval-static `memoryHint`) — proven
by two dedicated integration tests using the population pipeline
directly (co-location convergence; capability-restricted return-to-range).

## 11. Separation/reunion model

`SeparationState{id, worldId, subjectType, subjectId, entityId,
separatedSinceTick, active, resolvedAtTick}`, `ReunionEvent{id, worldId,
subjectType, subjectId, entityId, tick, separationDurationTicks}` — a
pure state-transition function (`evaluateSeparationTransition`), zero
emotion, four branches (not-separated→not-separated is a no-op;
not-separated→separated opens a new record; separated→separated is
stable; separated→not-separated resolves and fires a `ReunionEvent`).
Host-layer subject-id convention (documented, not a package change):
`RELATIONSHIP` subjects use the relationship's own id (one record per
relationship, symmetric by construction); `GROUP_MEMBERSHIP` subjects use
`"<groupId>::<entityId>"` to disambiguate multiple independently-separated
members of the same group.

## 12. Social consequence model

No new consequence type. `REUNION_OCCURRED` candidates attach the
existing `GROUP_HISTORY_RELATIONSHIP` consequence only when
`subjectType === "GROUP_MEMBERSHIP"` (§4, decision 5) — reused, not
duplicated.

## 13. Entity Memory + World Memory integration

**PASSED.** `SEPARATION_OCCURRED` is always `MEANINGFUL` (the Host layer
only raises a candidate after its own detection fires); `REUNION_OCCURRED`
is `MEANINGFUL` only when `separationDurationTicks` crosses a configurable
threshold (default 2) — "a member drifting a tick or two is not history,"
per the mission's own Phase 12 instruction. Both feed `RECENT_SEPARATION`/
`RECENT_REUNION` Entity Memory entries and a `social_relationship_changed`
`ReturnRecognitionFactType`, through the SAME `deriveWorldEvents`/
`deriveEntityMemoryEntries`/`computeReturnRecognition` functions Sprint 11
built — proven both by 9 targeted unit tests and by two Host-integration
tests (`lib/socialEcology/hostService.test.ts`'s own "separation"/"reunion"
tests) exercising the real repository → transition → World Memory path.

## 14. Emergent encounter integration

**PASSED.** A new rule (`avatark-social-recent-reunion-kadamba-grove`)
reuses Sprint 11's existing, unmodified `resolveEmergentEncounterOpportunities`
mechanism — zero new engine, since social-ecology's own appended
`WorldEvent`s land in the SAME `worldEventRepository`
`getEmergentEncounterOpportunities` already scans. Proven end to end: a
fabricated-then-resolved separation produces a `REUNION_OCCURRED` event,
and the very next `getEmergentEncounterOpportunities` call surfaces the
new rule's opportunity at that event's own recorded location.

## 15. Canonical-protection result

**PASSED.** No table in the prepared migration touches protected
narrative state; `packages/social-ecology-runtime`'s own source contains
zero occurrences of `protectedNarrative` at all (the strongest form of
the invariant — stricter than prior sprints' "no write method call"
check, since this domain never reads it either) — statically re-verified
by an extension of the existing dependency-boundary test.

## 16. Multi-visitor result

**PASSED.** `getSocialPerception` and `getEmbodimentWithSocialEcology`'s
own `LocationSocialSummary` carry no visitor/user identity anywhere in
their read path — two independent calls for the same entity/location
produce byte-identical results (`assert.deepEqual`), proving relationship/
separation state is shared systemic world truth, never a per-visitor
projection.

## 17. Persistence/checkpoint integration

Every new repository (`RelationshipRepository`, `GroupMembershipRepository`,
`FamiliarityRepository`, `HomeRangeRepository`, `SeparationRepository`) is
a plain upsert-by-stable-key store — naturally idempotent under replay
without needing content-derived-id dedup, since these are STATE records,
not an event stream (unlike `WorldEvent`/`EntityMemoryEntry`, which do use
content-derived ids via `deriveSeparationId`/`deriveReunionId` for the two
genuinely event-shaped facts, separation-begin and reunion). Migration 029
documents exactly this source-of-truth/audit-only split per table.

## 18. Replay/idempotency result

**PASSED, and one genuine bug found and fixed this sprint.** Waking twice
at the identical wall-clock instant initially double-counted relationship/
familiarity evidence (co-presence evidence went 0→1→2 across two zero-tick
replays) — separation/reunion detection itself was already idempotent
by construction (unchanged inputs produce an unchanged transition), but
evidence accrual was not. Fixed with an `afterTick > lastRelevantTick`
guard (relationship) and `afterTick > current.lastUpdatedTick` guard
(familiarity), using a `-1` sentinel to distinguish "never yet recorded"
from "recorded at tick 0" — proven by a dedicated "waking twice" test in
`lib/socialEcology/hostService.test.ts`.

## 19. Embodiment integration

**Host-level composition only, a second time.** `WorldEmbodimentSnapshotWithSocialEcology`
wraps Sprint 11's own (unmodified) `WorldEmbodimentSnapshotWithHistory`
with a `social: LocationSocialSummary` field. Neither
`@avatark/world-embodiment-contracts` nor `-runtime` gained any new
dependency on Social Ecology — no third widening of that contract (Sprint
10 widened it once for population; Sprint 11 declined to widen it again
for memory; Sprint 12 holds the same line).

## 20. Deltas result

**No change required, confirmed by direct inspection.**
`packages/world-embodiment-runtime/src/embodimentDelta.ts`'s
`diffWorldEmbodiment` operates purely on `WorldEmbodimentSnapshot`, which
social ecology never touches — the delta mechanism needed zero changes,
exactly as it needed none for Sprint 11's own history/memory facts.

## 21. Renderer-neutrality result

**PASSED.** Statically enforced (dependency-boundary extension: zero
React/Next.js/Unreal tokens in either new package's source). The one Web
renderer touch (`webSocialEcologyRenderer.ts`) is a fixed label-mapping
module from closed vocabularies (`RelationshipType`/`RelationshipBand`/
`SeparationSubjectType`) — never a paragraph, never a named character.

## 22. Alternate-world reuse proof

**PASSED, zero core changes.** `livingForestSocialEcologyPortability.test.ts`
runs the same fictional deer-herd fixture Sprint 7/9/10/11 established
through familiarity evolution, relationship-band derivation, separation/
reunion detection, social perception, and place attachment — the exact
same functions Vrindavan uses. No file in `social-ecology-runtime`
mentions "vrindavan," "cow," "yamuna," or any franchise/reference-entity
name.

## 23. Migrations prepared/applied status

**Nothing applied.** `supabase/migrations/029_social_ecology.sql` — 5
tables, RLS read-only for authenticated clients on all five (world-truth,
not visitor-owned), registered in `run-platform-migrations.js`'s
`MIGRATION_ORDER` for traceability only, same posture as migrations
023/026/027/028. The migration script itself was never run.

## 24. Phase 17 — RESOLVED-encounter debt disposition

**Deferred again, documented, not wired.** Investigated wiring
`recordEncounterResolved` (Sprint 11, never called from `lib/`) into the
live interact route. Found two coexisting, unbridged encounter mechanisms:
the live route (`app/api/.../interact/route.ts` →
`lib/worldPersistence/hostService.ts`'s `interact()`, which explicitly
discards its own `worldInstanceId` param — Sprint 9's own documented
seam) still dispatches through Sprint 5-8's `kernel.livingWorld`/
`resolveLivingSystemsSnapshot`, entirely separate from the Sprint 10/11
population-layer `EncounterOpportunity`/`encounterHistoryRepository`
`recordEncounterResolved` is typed against. Wiring them together would
mean reconciling two independent world-identity schemes — a genuine
integration decision, not a small wire-up, and exactly what Phase 17
itself says not to let dominate this sprint. Full reasoning in
`docs/SPRINT12_GROUND_TRUTH.md`.

## 25. Focused tests + regression result

**1277/1277 passing** (1195 Sprint 5-11 baseline + 82 new/extended Sprint
12 tests: 2 contracts + 41 social-ecology-runtime + 11 living-population
extensions + 9 world-memory extensions + 7 `lib/socialEcology` Host
integration tests + 6 web renderer + 6 dependency-boundary extensions).
`npm run typecheck` clean. `npm run lint` clean except pre-existing,
untouched findings (verified by grep — zero lint issues introduced by any
Sprint 12 file). Every prior sprint's own pre-existing test suite was
re-run unmodified and still passes, confirming every extension this
sprint made was genuinely additive.

## 26. Architectural invariants

All hold, restated from Sprint 11's own §27 plus this sprint's own new
proof points:
- **Domain separation** (Shared World State ≠ Entity/Population State ≠
  Entity/World Memory ≠ Visitor Memory ≠ Protected Canon), now including
  Relationship/Familiarity/HomeRange/Separation as further distinct,
  non-competing state — §3.
- **Protected Canon never gains a write path** — §15, now the strongest
  form checked (zero references, not just zero writes).
- **Renderer/Unreal-neutral core** — §21.
- **Visitor-absence-tolerant / visitor-memory-separated** — §16, no
  visitor parameter anywhere in the read path.
- **Replay idempotency** — §18, including the bug found and fixed this
  sprint.
- **World-specific rules remain data-driven** — the parent/offspring
  pairing, home ranges, and the new emergent rule are all Host-layer
  config (`lib/socialEcology/vrindavanSocialDefinition.ts`,
  `lib/worldMemory/vrindavanMemoryDefinition.ts`), never engine branches.
- **Alternate-world reuse, zero core changes** — §22.
- **Sprint 7 causal engine / Sprint 9 persistence / Sprint 10 population
  engine / Sprint 11 memory engine remain authoritative, unmodified** —
  every extension this sprint made was an optional, backward-compatible
  field/param, each proven non-breaking by the full pre-existing test
  suites passing unmodified (§25).

## 27. Non-canonical Host-layer judgment calls (documented, easy to revisit)

1. The parent/offspring pairing between Sprint 10's two already-seeded,
   neutral cows (`lib/socialEcology/vrindavanSocialDefinition.ts`) — a
   Host-layer, non-canonical relationship, same posture as Sprint 10's
   own cow/bird-flock archetype naming.
2. `REFERENCE_ENTITY` role assigned to the first member of each seeded
   group — an arbitrary-but-stable systems convention, not a leadership
   claim.
3. Each group's own initial seed location doubles as its home range —
   no new location or preference invented.
4. The new emergent-encounter rule's location (`kadamba-grove`) was
   chosen empirically (the herd's own deterministic emergent destination
   in the test's own timeline), not hardcoded to an assumption about
   where reunions "should" happen.
5. Subject-id disambiguation convention for `GROUP_MEMBERSHIP`
   separations (`"<groupId>::<entityId>"`) — a Host-layer string
   convention, not a contract change (§11).

## 28. Dependency-boundary extension result

**PASSED.** `social-ecology-contracts` declares/imports at most
`runtime-contracts`/`living-systems-contracts`/`living-population-contracts`;
`social-ecology-runtime` declares/imports at most those three plus
`social-ecology-contracts`; neither depends on any renderer, embodiment,
persistence, memory, or population-RUNTIME package, nor `@avatark/account`;
neither contains a React/Next.js/Unreal token; the runtime package
references protected narrative state nowhere at all. 6 new tests, all
passing, alongside every prior sprint's own boundary tests (49 total in
that one file, all green).

## 29. Group-membership scope note

Group membership is deliberately audit-only this sprint (§4, decision 1;
§6) — `GroupMembership` records exist for identity/establishedTick/role,
but Sprint 10's `GroupState.memberEntityIds` remains the sole live
authority, unmodified at runtime. Dynamic join/leave is a materially
bigger feature explicitly deferred, not attempted partially.

## 30. Idempotency fix detail

See §18. This is called out separately here because it is the one place
this sprint's own new code (not a pre-existing invariant) needed a
correction after initial implementation — found by the sprint's own test
suite, not by inspection, and fixed with a minimal, targeted guard rather
than a broader refactor.

## 31. Technical debt

1. Phase 17's `RESOLVED`-encounter debt remains deferred (§24) — now a
   two-sprint-old, well-documented item for a future sprint whose scope
   is explicitly reconciling the two encounter mechanisms.
2. The one new emergent-encounter rule shipped
   (`avatark-social-recent-reunion-kadamba-grove`) is a single
   illustrative example, mirroring Sprint 11's own single-rule scope —
   proving the mechanism, not exhausting its design space.
3. Familiarity/relationship evidence accumulates at most once per wake
   call (an end-of-catch-up-state comparison), not once per simulated
   tick within a multi-tick catch-up — a deliberate, documented scope
   choice (mirroring Sprint 11's own before/after-only significance
   comparison), not a bug, but worth revisiting if a future sprint needs
   tick-granular social evidence.
4. `GroupMembership`'s `REFERENCE_ENTITY` role is modeled and seeded but
   not yet read by any live behavior — reserved for a future world
   grammar that wants to name one member as more influential to group
   direction, per its own contract-level comment.

## 32. Blockers

None. No genuine architectural or canon conflict arose.

## 33. Exact recommendation

Sprint 12 proves the full social-ecology pipeline end to end, additively,
without rewriting Sprint 7's causal engine, replacing Sprint 9's
persistence, creating a competing population or World Memory engine, or
inventing any canon. The most direct Sprint 13 candidates: (a) a real
dynamic group join/leave mechanism, now that audit-only membership
records already exist to build on (§29); (b) reconcile or retire the
Sprint 5-8 kernel-based encounter path against the Sprint 9+
world-persistence encounter path (§24, technical debt #1) — recommended
as its own scoped sprint, not a bolt-on; (c) expand the emergent-encounter
rule set and social-behavior vocabulary now that both mechanisms are
proven. Ask before assuming which.

SOCIAL ECOLOGY FOUNDATION VERIFIED — READY FOR SPRINT 13
