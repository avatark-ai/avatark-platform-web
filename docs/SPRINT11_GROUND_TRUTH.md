# Sprint 11, Phase 0 — Ground Truth / Ownership Report

Branch `feature/sprint11-world-memory`, off `feature/sprint10-living-population`
@ `5f0922f`. Written before any Sprint 11 code.

## Ownership map — the six state domains

1. **Shared World State** — `SharedWorldState` (Sprint 7). Owned
   exclusively by `lib/worldPersistence/hostService.ts`'s `wakeWorld`/
   `advanceWorld` (Sprint 9). Unchanged this sprint.
2. **Entity/Living State** — `LivingEntityState` (Sprint 7, identity/
   location/coarse-lifecycle) + `EntityBehaviorState`/`GroupState`
   (Sprint 10, needs/rhythm/activity/movement/group). Owned by
   `lib/livingPopulation/hostService.ts`. Unchanged this sprint.
3. **Entity Memory** — does not exist yet. New this sprint.
4. **World Memory** — does not exist yet. New this sprint.
5. **Visitor Meaningful Memory** — `VisitorWorldMemory` (Sprint 7,
   `living-systems-contracts`), `userId`+`worldId` scoped, get-only
   cross-user. Unchanged this sprint — explicitly proven still separate
   (Phase 15).
6. **Protected Canonical Narrative** — `ProtectedNarrativeProjection`
   (Sprint 7), read-only, get-only repository interface (no `save`
   method exists on the interface at all). Unchanged this sprint.

## What already exists that Sprint 11 must not duplicate or compete with

- **`WorldSystemEvent`/`WorldSystemEventRecord`** (Sprint 7/9) is the
  RAW, unfiltered simulation-transition stream (`season.transitioned`,
  `entity.lifecycle_changed`, `clock.advanced`) — already durable,
  already idempotent (content-derived `eventId`). The mission is
  explicit: **World Memory is NOT this stream** — it is a
  *significance-filtered* derivation from it (plus population deltas),
  with its OWN identity. Sprint 11 consumes `WorldSystemEventRecord` as
  a read-only input; it does not touch `WorldSystemEventRepository`.
- **`ExperienceRegistry`** (`@avatark/experience-registry`) is
  visitor-scoped, append-only, curated vocabulary — explicitly not to be
  turned into World Memory (mission's own instruction). Sprint 11 never
  imports or writes to it.
- **Sprint 10's population engine** (`advancePopulationSimulation`) is
  the one and only tick loop advancing population state. Sprint 11 does
  not fork it — it EXTENDS its result shape additively (one new field,
  `populationEvents`, emitted from data the loop already computes each
  tick) so World Memory has structured deltas to derive from, exactly
  the same "extend, never fork" pattern Sprint 9 already used on Sprint
  7's `WorldSystemEvent` and Sprint 10 already used on Sprint 8's
  `EntityPresentation`.
- **`resolveAvailableEncounters`** (Sprint 7) and
  `computeEncounterOpportunities` (Sprint 10) remain the base encounter
  computation, unmodified. "Emergent" encounters (Phase 9) are a SECOND
  PASS layered on top in `world-memory-runtime`, never a change to
  either existing function.

## Where World Memory and Entity Memory belong

New packages, following the Sprint 9/10 precedent exactly:
`packages/world-memory-contracts` (types + repository interfaces only)
and `packages/world-memory-runtime` (pure derivation functions +
reference in-memory repositories). Host wiring lives in the new
`lib/worldMemory/`, additive alongside (never modifying)
`lib/worldPersistence/` and `lib/livingPopulation/`.

**Dependency-direction decision** (revised during implementation, now
simpler than first planned): World Memory never consumes
`WorldSystemEventRecord`/durable-persistence types directly. Instead,
`deriveWorldEvents`'s params take plain, already-structured deltas
(`{tick, fromSeasonId, toSeasonId}` for a season transition, etc) that
the HOST layer builds from whatever source (Sprint 9's durable event
log, Sprint 10's `PopulationEvent`s, encounter-availability diffs) —
world-memory-runtime itself never imports
`@avatark/world-persistence-contracts` at all. Its only cross-domain
dependency beyond `living-systems-contracts` is
`@avatark/living-population-contracts` (for the `PopulationEvent` and
`EncounterOpportunity` input shapes). This keeps World Memory's own
package boundary narrower than originally anticipated — a better
outcome than the wider fan-in first planned. No package below World
Memory ever depends back on it (statically enforced, same mechanism as
every prior sprint's boundary test).

## Embodiment integration decision

Rather than widening `@avatark/world-embodiment-contracts` a second
time, Sprint 11's historical fields (`recentWorldChanges`,
`historicalMarkers`, `returnRecognition`, `encounterHistoryState`) are
composed at the **Host layer only** — a new
`WorldEmbodimentSnapshotWithHistory` wrapper type in `lib/worldMemory/`
that spreads an existing `WorldEmbodimentSnapshot` plus a `history`
field. This keeps `world-embodiment-contracts`/`-runtime` with zero new
dependency on `world-memory-contracts`, avoiding the exact kind of
repeated contract-widening the mission's Phase 22 (renderer neutrality)
warns against normalizing.

## No conflict found

No genuine architectural or canon conflict blocks Sprint 11. Proceeding.
