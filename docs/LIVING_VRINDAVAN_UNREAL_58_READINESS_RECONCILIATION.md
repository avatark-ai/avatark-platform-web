---
status: DOCS-ONLY -- reconciliation of a prior docs-only package against the now-CLOSED Build 04
base: feature/living-vrindavan-build-04 @ 20abf24 (Builds 01-04, all CLOSED, verified against origin before this reconciliation began)
reconciles: feature/living-vrindavan-unreal-58-fab-readiness @ 2fcb3a3 (docs/LIVING_VRINDAVAN_UNREAL_58_FAB_READINESS.md)
---

# Living Vrindavan -- Unreal 5.8 / Fab Readiness Reconciliation (Post-Build-04)

The prior readiness package (`feature/living-vrindavan-unreal-58-fab-readiness @ 2fcb3a3`) was
written against Build 03's closed tip, deliberately not reading Build 04's then-active,
uncommitted worktree. Build 04 has since closed
(`feature/living-vrindavan-build-04 @ 20abf24`, 1749/1749 tests, VERIFIED). This document
reconciles the two rather than rewriting the earlier package's own history -- its own §A/§O/§Q
tables stay as they were written; this document states what changed since.

Per this mission's own instruction, this is a **new** document, not an edit to the prior package.

---

## 1. Reconciling Build 04 against the five named dependencies

### 1.1 Production embodiment richness ("two embodiment paths")

**STILL OPEN -- not retired, not altered, explicitly named unaffected.**

The prior readiness doc's §A table called this **PARTIALLY READY**: the production translator
path (`translateToUnrealCommands`) consumes Sprint 8-level richness only, while the richer
composed chain (`getEmbodimentWithCanonicalEvents`) is fully built and tested but not called by
any production route (Build 02 Phase 0 §2, reconfirmed unresolved by Build 03 final report
§7.3/§12.2).

Build 04's own final report, §6.3, lists "production-route retrofit" among the Build 01/02/03
limitations "not superseded above" that "remains open and unaffected by this build." Build 04's
own reconciliation record independently confirms the same fact from a second angle: it explicitly
composes around the Sprint-7 singleton (`WorldRuntime`, per-visitor position) and the durable
`worldInstanceId` family as "two real, separate systems... composed together at the route layer,
not one," and states plainly that "that merge is not this build's mission."

Build 04 *did* add a third real read path
(`composeVrindavanWorldExperienceSnapshot`/`vrindavanPresentationProjection.ts`'s new `history`/
`territoryPressures`/`routeStates` fields), but it is additive to the existing presentation
projection, not a replacement for either of the two paths above, and it does not touch
`translateToUnrealCommands`'s own input coverage. **No third competing embodiment truth was
introduced** (relevant to the old package's own STOP gate §P.3 -- still clear).

**Net for Build 05**: an Unreal client fed through the production route today still only receives
Sprint 8-level entity/environment/region richness via `UnrealCommand`. The place-continuity/
orientation/territory/route/return-recognition richness Build 04 added is real and available (via
`WorldExperienceSnapshot`, §1.4 below) but has no corresponding `UnrealCommand` vocabulary to
carry it into a spatial engine (§1.5).

### 1.2 Runtime transport

**PARTIALLY ESTABLISHED -- real HTTP+JSON substrate now exists; no persistent-connection or
non-browser-auth story yet. Preserved as TBD for anything beyond a poll-based dev fixture.**

The prior readiness doc's §A table marked this **WAITING FOR BUILD 04**, correctly noting "no
transport is mandated by any existing contract" and declining to guess a shape.

Build 04 added two real Next.js HTTP `GET` routes:

- `app/api/account/living-vrindavan/entry` -- production, Supabase-session-authenticated,
  returns `{ orientation }`. Requires a real signed-in browser session (`supabase.auth.getUser()`);
  no bearer-token or service-role path exists for a non-browser client to authenticate against
  this route today.
- `app/api/dev/account/living-vrindavan/experience-snapshot` -- dev-only (`devRouteGuard()` 404s
  it in `NODE_ENV=production`), unauthenticated, plain query params
  (`world_instance_id`, `dev_user`, `since_tick`), returns `{ snapshot: WorldExperienceSnapshot }`.

Both are real, tested (via their composing functions), request/response JSON over HTTP -- the
minimum substrate an Unreal HTTP client (e.g. Unreal's `HttpModule`) could poll today, in a dev
setting, with zero new server-side work. This is **not** the "real dev/production Runtime endpoint
shape" the prior package speculated Build 04 might settle, because:

- It is poll-based, not push-based -- no WebSocket/SSE exists anywhere in this codebase for
  world-state changes. A client must re-request the full snapshot (or accept `sinceTick`-based
  `worldChangedSinceLastVisit` framing) rather than receive live deltas.
- The production route has no non-browser auth story.
- Nothing designates either route as "the" Unreal endpoint -- both are dev/diagnostic or
  visitor-facing web conventions Build 04 extended along the exact same lines Build 01 already
  established (`world-inspection`, `world-snapshot`, `embodiment-snapshot` dev routes predate
  Build 04).

**Net for Build 05**: the dev `experience-snapshot` route is real, working, and sufficient to
build the greybox's *first* snapshot-ingestion step against (§3, step 8) as a local HTTP fixture
-- this reconciliation recommends using it directly rather than a static file, since it is already
real and already tested. A genuine push transport and a non-browser production auth story remain
TBD and are out of scope for Build 05's proof (§6).

### 1.3 `worldInstanceId` / dev-fixture convention

**CONFIRMED STABLE -- pre-existing, not newly established by Build 04, and Build 04 conforms to
it rather than inventing a second one.**

The prior readiness doc's §O item 3 asked whether Build 04 would establish "a stable, documented
dev-fixture convention." It did not need to: `'living-vrindavan'` (matching the `WORLD_ID` export
in `lib/livingSystems/singleton.ts`) is already the default `world_instance_id` query-param value
across four dev routes -- `world-inspection`, `persistence/state`,
`persistence/population-embodiment`, and Build 04's own new `experience-snapshot`. Build 04's dev
route reuses this exact convention rather than introducing a build-specific id.

**Net for Build 05**: use `world_instance_id=living-vrindavan` (or simply omit the param and take
the default) as the one dev-fixture world instance for every greybox proof step. No new fixture
convention needs to be invented or agreed.

### 1.4 Experience snapshot -- exact contract shapes after Build 04

Real, as of `20abf24`:

```
WorldExperienceSnapshot {                          // packages/world-experience-contracts/src/worldExperienceSnapshot.ts
  worldId, userId, generatedAt: string
  suggestedStage: ExperienceStage                  // 13-stage descriptive graph, never enforced
  arrival: ArrivalDecision                          // FIRST_EVER_VISIT | RETURNING_TO_PRIOR_PLACE |
                                                     // CANON_DIRECTED_ENTRY | STALE_PRIOR_LOCATION_FALLBACK |
                                                     // SAFE_FALLBACK_ENTRY, + worldChangedSinceLastVisit flag
  orientation: OrientationProjection                // 5 semantic questions, no HUD spec
  place: PlaceContinuityView                        // identity, hierarchy, environment, day phase, season,
                                                     // occupancy, nearby entities/destinations (Route-aware),
                                                     // active rhythms, encounter opportunities, Canon-safe
                                                     // canonical presence, remembered consequences, visitor
                                                     // history, presentation hints
  nearbyPlaces: PlaceContinuityView[]                // one per direct-neighbor location
  recentWorldChanges: WorldEvent[]
  embodiment: Readonly<WorldEmbodimentSnapshot>      // EXACT, unmodified Build 02 shape -- see below
}
```

`embodiment` is the exact, unmodified `WorldEmbodimentSnapshot` (current + reachable
`EmbodiedRegion`s, entities, transitions, encounters) Build 02's own `translateToUnrealCommands`
already accepts -- proven again in Build 04 (acceptance proof N).

**What Unreal should consume today**: `embodiment`, unchanged, through the existing
`translateToUnrealCommands`/`translateEmbodimentDeltaToUnrealCommands`/
`translateGroupIntentToUnrealCommands` functions -- no new translator work required for Build 05's
region/entity-level greybox proof.

**What remains renderer-neutral** (real, typed, but with no translator or `UnrealCommand` op
today): `arrival`, `orientation`, `place` (all of `PlaceContinuityView`, including
`ReturnRecognition`, territory pressures, route states, canonical presence, and presentation
hints), `nearbyPlaces`, `recentWorldChanges`. This is new, real data since Build 03 -- none of it
is Unreal-shaped, none of it has a rendering decision made for it, and per Build 04's own final
report §7.2/§7.5, that decision correctly belongs to whoever builds the first greybox, not to this
reconciliation.

### 1.5 `UnrealCommand` coverage -- re-evaluated after Build 04

**Still insufficient for the new richness -- confirmed by direct inspection, unchanged since
Build 02.** `packages/world-embodiment-contracts/src/unrealCommand.ts` still has exactly the same
11 ops named in the prior readiness package: `CreateRegion`, `UpdateEnvironment`, `SetAtmosphere`,
`SetWaterState`, `SetVegetationIntent`, `PlaceEntity`, `UpdateEntity`, `RemoveEntity`,
`MoveEntityToRegion`, `SetGroupIntent`, `CreateInteractionAnchor`. Build 04 did not modify this
file (confirmed: no diff to `packages/world-embodiment-contracts/` in commit `20abf24`).

Evaluated specifically against the mission's five named presentation requirements:

| Requirement | `UnrealCommand` coverage today |
|---|---|
| Patch-level presentation | None. Every op addresses a `regionId` (1:1 with a `Location`, one layer above `PatchId`) -- unchanged Build 02 Phase 0 §21 gap. |
| Route presentation | None. No op names a `Route`, `RouteState`, or edge-traversability fact. `MoveEntityToRegion` moves one entity between two regions; it does not represent "this Route is currently open/closed/congested." |
| Place-Continuity presentation | None. Occupancy, nearby destinations, active rhythms, remembered consequences have no op. |
| Orientation presentation | None -- and structurally, Orientation is a *visitor-facing semantic answer* (5 questions), not a world-state fact; it is unclear a `UnrealCommand` op is even the right shape for it (more likely: UI/HUD-layer consumption of the snapshot field directly, never a spatial-engine command). Named here as an open design question, not assumed resolved. |
| `ReturnRecognition` presentation | None. `ReturnRecognition`'s semantic-fact-only output (Sprint 11 discipline: never prose) has no corresponding "show a recognition cue" op. |

**Conclusion, matching the prior package's own §O item 5 and Build 04's own final report §8.2**:
Patch/LocalPlace/Route-level `UnrealCommand` extension remains the correctly-deferred, real gap --
now with a fully concrete, Build-04-shaped target (the fields named above) instead of a
speculative one. This reconciliation does **not** design the new ops (per this mission's explicit
instruction not to invent mechanisms); §5 of the handoff document names them as candidates only.

---

## 2. Reconciling the old readiness document, section by section

Classification legend: **RESOLVED** (Build 04 settled it) / **STILL VALID** (Build 04 changed
nothing relevant, the old text remains accurate as written) / **SUPERSEDED** (Build 04 makes the
old text inaccurate or incomplete) / **DEFERRED** (Build 04 could have addressed it but
explicitly, correctly, did not) / **BLOCKED** (no path forward without a decision outside this
repository's authority).

| § | Topic | Classification | Note |
|---|---|---|---|
| A | Authoritative world snapshot | STILL VALID | Unchanged; `getWorldSnapshotForVisitor`/`getEmbodimentSnapshotForVisitor` untouched by Build 04. |
| A | World delta | STILL VALID | `WorldEmbodimentDelta`/`SpatialDelta` untouched. |
| A | Place/spatial projection (Patch gap) | STILL VALID | Gap confirmed unchanged (§1.5 above). |
| A | Entity presentation | STILL VALID | Unchanged. |
| A | Population/group presentation (two embodiment paths) | STILL VALID / DEFERRED | See §1.1 -- Build 04 named it unaffected rather than resolving it; the prior doc's "PARTIALLY READY" framing still holds verbatim. |
| A | Environment presentation | STILL VALID | Unchanged. |
| A | Visitor intent return path | STILL VALID | `dispatchInteractionIntent` unchanged through Build 04. |
| A | Stable semantic IDs | STILL VALID | Unchanged. |
| A | Canon projection boundary | STILL VALID | Build 04's reconciliation record independently re-confirmed exactly 6 Approved docs, 4 Approved locations, the same `govardhan-lifting` Host-authored caveat. |
| A | Runtime API/transport | **RESOLVED, PARTIALLY** | See §1.2 -- a real dev/local HTTP+JSON substrate now exists; production auth and push transport remain open, so this row moves from WAITING FOR BUILD 04 to PARTIALLY READY, not to fully READY. |
| A | Renderer capability negotiation | STILL VALID | Unchanged; not touched by Build 04. |
| B | Unreal repository plan (name, topology, LFS policy) | STILL VALID | Nothing in Build 04 bears on repository/tooling decisions; carried forward unchanged into §3 of the handoff doc below. |
| C | Git LFS / source control policy | STILL VALID | Same reasoning. |
| D | Runtime Bridge plan | **SUPERSEDED, PARTIALLY** | The `ConnectionManager` row's transport is no longer purely "TBD" -- a concrete dev fixture exists (§1.2). The "deliberately NOT designed here" `UnrealCommand` extension list (`UpdatePatchEcology`, `StageCanonicalProjection`, `UpdateGroupCohesion`) is now supersedable with a more concrete, Build-04-informed candidate list -- see handoff §5. |
| E | First Unreal greybox plan | STILL VALID, extended | Topology/entity-count facts unchanged (re-verified in §1 above against current source, not just re-cited). Handoff §3 extends this plan with the leave/return/recognition proof Build 04 now makes real. |
| F | World Partition / Data Layer plan | STILL VALID | No Build 04 finding touches world extent or spatial-grammar cardinality. |
| G | PCG entry plan | STILL VALID | Unaffected. |
| H | Yamuna realization plan | STILL VALID | Unaffected; `hydrologyCondition`/season pair unchanged. |
| I | Asset category matrix | STILL VALID | Unaffected; carried forward verbatim into handoff §7. |
| J | Marketplace decision framework | STILL VALID | Unaffected. |
| K | Asset registry design | STILL VALID | Unaffected; Runtime-never-knows-a-path invariant re-confirmed true (Build 04 introduced zero asset-path references, grepped clean). |
| L | First shopping pass plan | STILL VALID | Trigger sequence unaffected; still gated on the greybox existing first. |
| M | Build 05 implementation checklist | SUPERSEDED | Step 7's "reconcile the real transport against whatever Build 04 settles... if unresolved, build against a local static-fixture snapshot first" branch is now resolved in favor of the concrete option: use the real dev `experience-snapshot` route as the fixture, not a static file. See handoff §4 for the updated sequence. |
| N | GPU workstation handoff | STILL VALID | Checklist items unaffected by Build 04; carried forward into handoff §8. |
| O | Build 04 dependencies (this section's own five items) | RESOLVED (as a section) | Superseded by §1 of this document, which answers each of the five with Build 04's real outcome instead of a forward-looking question. |
| P | STOP gates | STILL VALID | All eight gates remain the correct gates; none has been triggered by Build 04 (re-verified: no snapshot-shape break beyond additive fields, no `worldInstanceId` ambiguity, no third competing embodiment truth, no Unreal type leak, no topology change, no canon-provenance change, translator still sufficient for its existing scope, no repository created). Carried forward unchanged into handoff §9. |
| Q | Summary | SUPERSEDED | Its own "Not established" list (transport, converged embodiment path, stable dev-fixture id) is now two-thirds resolved differently than it might have expected: the dev-fixture id was never actually unstable (§1.3), transport is partially real (§1.2), and the embodiment path convergence is confirmed still not attempted (§1.1). See handoff §1 for the current summary. |

No line of the original document was rewritten. Where Build 04 changed the facts, this table
says so explicitly; where it did not, the original stands as accurate history of what was known
at the time it was written.

---

## 3. What this reconciliation does NOT do

- Does not create an Unreal project, repository, or any `.uasset`/`.umap` file.
- Does not purchase any asset.
- Does not extend `UnrealCommand` (candidates are named, not implemented, in the handoff
  document's §5).
- Does not modify Build 01/02/03/04 (all confirmed untouched: `git status --short` clean in this
  reconciliation's own worktree throughout).
- Does not modify Runtime v1 core. No genuine blocking defect was found during this reconciliation
  that would require it.

See `docs/LIVING_VRINDAVAN_BUILD_05_UNREAL_HANDOFF.md` for the resulting Build 05 architecture,
implementation sequence, and GPU-workstation runbook this reconciliation feeds into.
