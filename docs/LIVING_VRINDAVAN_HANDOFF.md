# Living Vrindavan — Handoff Snapshot

**As of:** 2026-08-08, end of Sprint 8. Verify against `git log` before
trusting anything below — this is a point-in-time report, not a live
document. Supersedes every earlier version of this file (which covered
Sprint 5 only); this revision covers Sprints 5 through 8.

## Where things actually are

| Repo | Branch | HEAD | Remote |
|---|---|---|---|
| `avatark-platform-web` | `feature/avatar-platform-rc3` | `ff3d50d` | pushed |
| `avatark-platform-web` | `feature/living-vrindavan-integration` (Sprint 5) | `354e8d4` | pushed |
| `avatark-platform-web` | `feature/sprint6-experience-layer` (Sprint 6) | `da38dbb` | not pushed |
| `avatark-platform-web` | `feature/sprint7-living-systems` (Sprint 7) | `190dd3c` | not pushed |
| `avatark-platform-web` | `feature/sprint8-world-embodiment` (Sprint 8) | `2400e5e` | not pushed |
| `studiok-canon` | `feature/living-vrindavan-seasons-canon` | `c6bc297` | **no remote — local only** |
| `studiok-specifications` | `feature/living-systems-specification` | `0712b5d` | **no remote — local only** |
| `studiok-platform` | `feature/stk-wo-006-living-systems` | `8e76c1b` | **no remote — local only** |

`feature/avatar-platform-rc3` on origin contains Runtime Kernel Sprints
1–4 only. **Sprints 5, 6, 7, and 8 are not merged to RC3** — each sits on
its own branch, stacked on the one before it
(`sprint6 → sprint7 → sprint8`), unmerged, by design. Nothing has asked
for that merge yet.

StudioK tags: `studiok-canon` has `v0.1.0` (STK-CAN-001..005) and `v0.2.0`
(adds STK-CAN-006). `studiok-specifications` has `v0.1.0`
(STK-SPEC-001/002), `v0.2.0` (adds STK-SPEC-003/004), `v0.3.0` (adds
STK-SPEC-005/006). All Approved. All tags local-only (no remote).

## Worktrees in use (do not delete without checking first)

```text
avatark-platform-web                             — feature/consumer-platform-architecture (original, pre-existing work, untouched)
avatark-platform-web-rc3-validation              — feature/avatar-platform-rc3 (post-merge validation checkout)
avatark-platform-web-living-vrindavan            — feature/living-vrindavan-integration (Sprint 5)
avatark-platform-web-sprint6-experience          — feature/sprint6-experience-layer (Sprint 6)
avatark-platform-web-sprint7-living-systems      — feature/sprint7-living-systems (Sprint 7)
avatark-platform-web-sprint8-world-embodiment    — feature/sprint8-world-embodiment (Sprint 8, THIS is the active one)
avatark-platform-web-runtime-host-integration, -runtime-kernel-integration, -runtime-kernel-sprint-2,
  -context-runtime, -experience-registry, -experience-runtime, -living-world-runtime, -narrative-runtime,
  -integration-sprint-1, -ai4, -runtime-rc-integration
  — older Sprint 1–4 source worktrees, superseded by the rc3 merge but left intact
```

## What's done (verified, not just claimed), by sprint

**Sprint 5 — Living Vrindavan vertical slice.** StudioK Canon →
Specification → vendored portable artifact → AvatarK Host adapter →
Living World Runtime → Context → Registry → Timeline → consumer UI. Four
locations (Vrindavan Entry, Yamuna, Kadamba Grove, Govardhan Path), one
reflection affordance at Yamuna. STK-WO-003/004 Closed.

**Sprint 6 — Experience Description layer.** STK-SPEC-003/004 (renderer-
neutral per-location experience intent: biome, atmosphere, soundscape,
presentation pacing/intensity). New `@avatark/renderer-contracts` package
(`RendererAdapter`, capability negotiation). Web reference renderer gives
each of the 4 locations a distinct accent color/atmosphere caption.
Manifest-based artifact-ingestion mechanism (`vendor/manifest.json` +
`artifactIngestion.ts`, checksum-verified at module load). STK-WO-005
Closed.

**Sprint 7 — Living Systems Foundation.** STK-CAN-006 (Vasanta/Grīṣma
seasonal identity) + STK-SPEC-005/006 (causal systems: seasons,
environmental envelopes, 2 neutral entity archetypes, 4 encounter rules
incl. one narrative-protected). New `@avatark/living-systems-contracts` +
`@avatark/living-systems-runtime` packages: explicit causal pipeline
(season→weather→hydrology→ecology), deterministic variation, entity
persistence, `WorldSnapshot` resolution. Proved the world evolves
independent of any visitor (leave → advance clock → season transitions →
return → same visitor memory + new shared state) and that two visitors
share world state but not visitor memory. STK-WO-006 Closed.

**Sprint 8 — World Embodiment Layer.** No new StudioK content — Sprint
6's `ExperienceDescription` already supplied the presentation-intent
StudioK layer Sprint 8 needed, so no governance gate was reached. New
`@avatark/world-embodiment-contracts` + `@avatark/world-embodiment-runtime`
packages: `WorldSnapshot` → `WorldEmbodimentSnapshot` (spatial layout,
environment/entity/encounter presentation, current + reachable regions),
`InteractionIntent` boundary (renderer → Host → existing Sprint 5
orchestrator, never a new mutation path), delta reconciliation
(ADD/UPDATE/REMOVE/UNCHANGED by stable id), capability negotiation, and a
headless Unreal-*compatible* command translator (`CreateRegion`/
`UpdateEnvironment`/`PlaceEntity`/etc — zero Unreal dependency). Web
reference renderer now consumes the embodiment contract instead of
reading Living Systems internals directly. Proved Web/Unreal-command
semantic parity and reusability for a wholly fictional world, all without
touching Runtime Kernel code. 996/996 unit tests, 62/62 Playwright across
desktop/tablet/mobile (15 new Sprint 8 + 15 updated Sprint 7 + 32 Sprint
5/6 baseline).

## Explicit constraints still in force (nobody lifted these)

- None of Sprints 5–8 are merged into `feature/avatar-platform-rc3`. Do
  not merge without being asked again.
- No database migrations have been applied anywhere.
- `Living Forest` / `Living Stillness` / `Living Symphony` / `Living
  Forge` are still on the original generic `SAMPLE_WORLD_DEFINITIONS`
  fixture — untouched through all four sprints, confirmed by `git diff
  --stat` showing zero changes to `packages/living-world-runtime` or its
  singleton composition each sprint. Only Living Vrindavan is real.
- Do not build Unreal, PCG, GameK, PrometheusK, or StreamK integration —
  every sprint's own instructions deferred these, and Sprint 8's Unreal
  adapter is explicitly headless/schema-only (no engine installed, no
  project created).
- Sprint 8's `select-encounter` intent intentionally causes no persisted
  state change — Sprint 7 never gave encounters a "selected" consequence,
  and Sprint 8 didn't invent one.

## Loose ends / technical debt (small, named, not blocking)

1. StudioK repos have no git remotes in this environment — all work is
   committed locally only, across five tags (`v0.1.0`–`v0.3.0` on two
   repos) that would need pushing if a real remote appears later.
2. AvatarK's StudioK artifact pins remain manually-vendored, reviewed
   JSON copies (`lib/livingWorldRuntime/vendor/`), not real package-
   registry dependencies — acceptable per Sprint 6/7's own closure
   criteria; upgrade path is real publishing once these repos have
   remotes.
3. `nextLocations`'s derivation logic doesn't exclude already-visited-
   but-still-reachable locations (e.g. Yamuna reappears as "next" when
   standing at Kadamba Grove, since it's still a legal revisit). Not a
   bug — just noted, not fixed (unchanged since Sprint 5).
4. `EntityPresentation.visible` is always `true` in Sprint 8's reference
   model — no per-archetype "away" lifecycle-phase vocabulary exists yet
   (would need a StudioK schema addition, not invented unilaterally).
5. Sprint 8's spatial layout is an abstract graph position (BFS depth +
   sibling spread), not real-world/Unreal-ready geometry — deliberately
   out of scope ("do not build production terrain").
6. Same in-memory/no-Postgres limitation every sprint since Sprint 4 has
   carried: Living World state, Living Systems shared-world state, and
   the Experience Registry all reset on process restart.
7. Two real regressions were found and fixed *during* Sprint 8 (a
   duplicate `aria-live` region and a duplicate "Ambient sound" button
   label, caused by Sprint 8's panel changes colliding with Sprint 6's
   existing component on the same page) — caught by re-running the
   Sprint 5/6 Playwright baseline, not missed silently. Worth remembering
   as a category of risk for Sprint 9: any new panel sharing a page with
   `LivingWorldDetailView` needs to check for label/aria collisions.
8. `studiok-canon`'s STK-WO-003 is `In Progress`, not `Closed` — one
   Deliverable (updating `studiok-docs`'s Canon section) was out of
   Sprint 5's own repo scope and was never done. Unchanged since Sprint 5.

## Verifying this snapshot is still accurate

```bash
# AvatarK
cd /home/user/workspace/avatark-platform-web-sprint8-world-embodiment && git log --oneline -3
# StudioK (no remotes, so purely local state)
cd /home/user/workspace/studiok-canon && git log --oneline -3 && git tag -l
cd /home/user/workspace/studiok-specifications && git log --oneline -3 && git tag -l
cd /home/user/workspace/studiok-platform && git log --oneline -3
# RC3 untouched
cd /home/user/workspace/avatark-platform-web-rc3-validation && git log --oneline -1 && git status --short
# Full test suite (996 tests as of this snapshot)
cd /home/user/workspace/avatark-platform-web-sprint8-world-embodiment && pnpm install --prefer-offline && npm test
```

## Recommended next step

Sprint 8 ended with: **WORLD EMBODIMENT FOUNDATION VERIFIED — READY FOR
SPRINT 9**. Sprint 9 scope was not specified. Likely candidates, given
the layering established so far (Canon → Specification → Living Systems
→ Embodiment → Renderer Adapter):

- A second real Living World (Forest/Stillness/Symphony/Forge) proving
  the full Sprint 5–8 stack generalizes beyond fixtures/tests to a real
  StudioK-authored world — the most direct "prove reusability for real"
  next step.
- Deepening the protected-narrative layer (currently an honest, always-
  unresolved placeholder) with a real canonical-narrative system, now
  that Sprint 8's boundary contract for it exists.
- Beginning the real Unreal adapter implementation, now that Sprint 8's
  headless command schema is proven — explicitly deferred by every prior
  sprint's own instructions until asked for directly.

Ask before assuming which.
