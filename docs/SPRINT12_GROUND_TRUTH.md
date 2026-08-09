# Sprint 12, Phase 0 — Ground Truth / Ownership Report

Branch `feature/sprint12-social-ecology`, off `feature/sprint11-world-memory`
@ `4228615`. Written before any Sprint 12 code.

## Ownership map

- **SharedWorldState** (Sprint 7) — owned exclusively by
  `lib/worldPersistence/hostService.ts`. Unchanged.
- **LivingEntityState** (Sprint 7, identity/location/coarse-lifecycle) +
  **population runtime** (`EntityBehaviorState`, Sprint 10) — owned by
  `lib/livingPopulation/hostService.ts`. Unchanged in its core mechanism;
  additively extended (see below).
- **Group/herd/flock state** (`GroupState`, Sprint 10) — owned by
  `lib/livingPopulation/` via `groupStateRepository`. Sprint 12 does
  **not** replace this store — it reads/writes the SAME `GroupState`
  rows through the SAME repository, and adds a NEW, disjoint
  `GroupMembership` audit record alongside it (identity/establishedTick
  tracking), never a second group authority.
- **EntityMemory / WorldMemory** (Sprint 11) — owned by
  `lib/worldMemory/hostService.ts`. Sprint 12 does not create a
  competing store; it extends the EXISTING `WorldEventCategory` and
  `EntityMemoryEntryType` unions with two new values each
  (`SEPARATION_OCCURRED`/`REUNION_OCCURRED`,
  `RECENT_SEPARATION`/`RECENT_REUNION`) and feeds new candidate inputs
  into the SAME `deriveWorldEvents` significance pipeline — the exact
  additive pattern Sprint 11 itself used on Sprint 10's outputs.
- **VisitorWorldMemory** (Sprint 7) — untouched. Social ecology never
  reads or writes it.
- **ProtectedNarrativeProjection** (Sprint 7) — untouched, read-only,
  no write path added.
- **Encounter resolution** (`resolveAvailableEncounters` Sprint 7,
  `computeEncounterOpportunities` Sprint 10,
  `resolveEmergentEncounterOpportunities` Sprint 11) — untouched;
  Sprint 12 supplies social/relationship facts as additional INPUT to
  Sprint 11's own emergent-rule mechanism, never a new resolution path.
- **Embodiment** (Sprint 8/10/11) — `EntityPresentation`'s existing
  `groupId`/`movementSemantic` fields already carry most of what social
  behavior needs, since Sprint 12's new `BehaviorType`/`MovementIntentType`
  variants flow through the SAME mechanism Sprint 10 built. No third
  widening of `@avatark/world-embodiment-contracts` — separation/reunion
  markers are Host-level composition, same posture as Sprint 11's
  `WorldEmbodimentSnapshotWithHistory`. Confirmed by reading
  `packages/world-embodiment-runtime/src/embodimentDelta.ts` directly:
  `diffWorldEmbodiment` operates purely on `WorldEmbodimentSnapshot`,
  which social ecology never touches — so the delta mechanism (Phase 26)
  requires zero changes, exactly as Sprint 11's own history/memory facts
  required none.
- **Persistence/checkpoint/replay** (Sprint 9) — untouched authority;
  social state gets its own new repositories, following the exact same
  idempotent-by-content-derived-id discipline.

## Key design decisions (the genuinely new architectural calls)

1. **Group membership stays audit-only this sprint, not dynamic.**
   Sprint 10's `GroupState.memberEntityIds` is seeded once and never
   changes at runtime today. Rather than building dynamic join/leave
   machinery (a materially bigger feature), Sprint 12 detects
   "separation" as **a member whose `locationId` no longer matches its
   group's own `locationId`** — the member never leaves
   `memberEntityIds`, so Sprint 10's own cohesion calculation already
   models "temporarily separated but still a member" correctly,
   unmodified. `GroupMembership` records exist (stable id,
   `establishedTick`, role) for identity/audit purposes and *can*
   express a join/leave rule, but this sprint's live Host path keeps
   membership static post-seed — the same "prepared, not fully
   exercised" honesty Sprint 7 used for `VisitorWorldMemoryRepository`.
2. **Separation is generic across relationship kinds.** A single
   `SeparationState{subjectType: "RELATIONSHIP" | "GROUP_MEMBERSHIP",
   subjectId, entityId}` shape covers both "offspring separated from
   parent" (an entity-to-entity `RelationshipState`) and "member
   separated from group" (comparing an entity's location to its
   group's), rather than two parallel mechanisms.
3. **Familiarity and Relationship stay distinct types**, per the
   mission's own Phase 3/6 split: `FamiliarityState` is bounded,
   evidence-based, per-entity-pair (`UNKNOWN`/`SEEN`/`FAMILIAR`);
   `RelationshipState` is the first-class, typed, persistent record
   (`PARENT_OFFSPRING`/`GROUP_MEMBER`/`FAMILIAR`/`PREFERRED_ASSOCIATE`)
   that familiarity crossing a threshold can *establish or upgrade* for
   the two non-grammar-seeded types.
4. **No new "SocialContext" type.** The mission lists `SocialContext`
   alongside `SocialPerception` in Phase 1, but Phase 8's own examples
   are all perception-shaped facts. Sprint 12 folds them into one
   `SocialPerception` type rather than two overlapping ones — a
   deliberate consolidation, documented here rather than silently
   dropped.
5. **`SocialConsequence` reuses Sprint 11's existing
   `WorldConsequenceType` where the shape already fits**
   (`GROUP_HISTORY_RELATIONSHIP` already covers "this entity's group
   association changed"); no new consequence type was needed.

## What Sprint 12 extends (additively) vs. never touches

Extended (new enum variants / optional params only, zero behavior change
for any existing caller who doesn't pass the new argument):
`BehaviorType`, `MovementIntentType` (`living-population-contracts`);
`selectBehavior`, `resolveMovementIntent`
(`living-population-runtime`); `WorldEventCategory`,
`EntityMemoryEntryType` (`world-memory-contracts`); `evaluateSignificance`,
`deriveWorldEvents`, `deriveEntityMemoryEntries`, `computeReturnRecognition`
(`world-memory-runtime`).

Never touched: `advanceWorldSimulation` (Sprint 7), `wakeWorld`/
`durableWorldStateRepository` (Sprint 9), `advancePopulationSimulation`'s
own tick-loop structure or `GroupState`/`EntityBehaviorState` shapes
(Sprint 10, beyond the additive params above), `deriveWorldEvents`'s
existing candidate-building branches (Sprint 11, only new branches
added).

## Phase 17 — Sprint 11's deferred RESOLVED-encounter debt: deferred again, not wired

Inspected whether `recordEncounterResolved`/`EncounterHistoryStatus.RESOLVED`
(`packages/world-memory-runtime/src/encounterHistory.ts`, written in Sprint
11 but never called from anywhere in `lib/`) could be wired into the live
interact route this sprint.

**Finding: two separate encounter mechanisms already coexist, unbridged,
by Sprint 9's own explicit design** —

- The **live** mutation path (`app/api/account/living-vrindavan/interact/route.ts`
  → `lib/worldPersistence/hostService.ts`'s `interact()` → Sprint 8's
  `dispatchInteractionIntent`'s `"select-encounter"` branch) checks
  availability via `resolveLivingSystemsSnapshot`/`kernel.livingWorld` —
  Sprint 5–8's own encounter/world-identity scheme. It does not read or
  write `EncounterOpportunity`, `computeEncounterOpportunities`, or
  `encounterHistoryRepository` at all.
- `recordEncounterResolved` is typed against `EncounterOpportunity`
  (`@avatark/living-population-contracts`), the Sprint 10/11 population-layer
  type read via `getPopulationSnapshot`/`getEmbodimentWithHistory` — a
  different encounter computation, keyed by `WorldInstanceId`, not
  `kernel.livingWorld`'s own world identity.
- `interact()` itself already documents this seam explicitly:
  `_worldInstanceId` is accepted-but-unused, "for API symmetry," with the
  dispatch itself "unchanged from Sprint 8" (`lib/worldPersistence/hostService.ts:150-157`).

Wiring `recordEncounterResolved` into the live route would mean reconciling
two independent encounter subsystems and two independent world-identity
schemes that have never been declared equivalent — a genuine integration
decision, not a small additive wire-up, and squarely the kind of thing
Phase 17 itself says not to let dominate Sprint 12.

**Disposition: deferred, unchanged from Sprint 11.** `recordEncounterResolved`
remains reachable only from the population-layer read path
(`getEmbodimentWithHistory`'s own `encounterHistoryState` projection, which
never calls it either, since nothing yet drives a "RESOLVED" transition on
that side). No code changed for Phase 17. Recommended for a future sprint
whose own scope is explicitly "reconcile or retire the Sprint 5–8
kernel-based encounter path against the Sprint 9+ world-persistence
encounter path" — not a one-line fix bolted onto Sprint 12's own social-ecology
scope.

## No conflict found

No genuine architectural or canon conflict blocks Sprint 12. The
parent/offspring fixture (Phase 4) will be a Host-layer, non-canonical,
neutral pairing of two already-seeded cow entities — the same judgment-call
posture Sprint 10 used for the cow/bird-flock archetypes themselves.
Proceeding.
