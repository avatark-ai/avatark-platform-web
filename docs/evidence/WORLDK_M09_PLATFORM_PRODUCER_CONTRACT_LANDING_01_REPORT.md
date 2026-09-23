# WORLDK_M09_PLATFORM_PRODUCER_CONTRACT_LANDING_01_REPORT

| | |
|---|---|
| Mission | WORLDK-M09-PLATFORM-PRODUCER-CONTRACT-LANDING-01 |
| Where | GCP Cloud Workstation, 2026-09-23 |
| Repository | `avatark-ai/avatark-platform-web` |
| Worktree | `~/workspace/avatark-platform-web-worldk-m09` (new, isolated) |
| Branch | `feature/worldk-m09-platform-producers` |
| Authority | M06 recon, M07 contract freeze (`CERTIFIED`), M08 web skeleton (`CERTIFIED`) |

## 1. Executive Summary

AvatarK Platform is now the producer of the M07 WorldK consumer contracts, on a clean branch pushed to origin. The branch is based on the preserved R07 continuity lineage. It adds five things:

1. **`@avatark/world-consumer-contracts` v1.0** — the frozen M07 schemas, byte-identical and checksum-pinned, plus typed equivalents, contract ownership, and a list of field names that must never appear in a consumer payload.
2. **A PublicWorldProjection producer** — driven by real Living Forest runtime facts and classified as fixture-backed.
3. **A VisitorWorldProjection and Since You Were Here producer** — derived from durable continuity plus the existing `computeReturnRecognition`.
4. **A durable absence ledger** — additive migration `036` plus adapters. It is proven on a disposable local Postgres and applied to no shared database.
5. **A public/private service boundary** — `GET /api/worlds/[worldId]/public-projection` and `…/visitor-projection`.

Test results:
- With the Postgres suite enabled: **1816/1816 pass** (the 1765 existing tests plus 51 new).
- With it disabled: 1806 pass and 1 is skipped (the Postgres suite, visibly).
- One existing Living Vrindavan test fails **intermittently**. It fails the same way at the baseline commit `b7dd145` (1 of 3 runs there) and is untouched by M09 (§16).

Not touched: worldk-web, StreamK, StudioK, dt4m-os, production databases, and deployment.

## 2. Mission Classification

Platform implementation of the producer side. Frozen M07 semantics are unchanged. No WorldK UI, entry resolver, runtime allocation, Unreal or streaming work.

## 3. Pre-flight / Worktree Safety

- **Primary worktree** (`~/workspace/avatark-platform-web`): `feature/consumer-platform-architecture` @ `dc6bee2`, 9 dirty entries belonging to another lane. **Not used** for implementation, and still byte-for-byte as found at the end of the mission.
- **Other worktrees:** all 38 were recorded. Every one except the primary was clean. None was checked out, stashed, reset or committed to.
- **Isolation:** M09 ran in a new worktree created from a clean commit.
- **Test infrastructure, all disposable and cleaned up:**
  - a Postgres container `worldk-m09-ledger-pg` (bound to `127.0.0.1:55439`, started with `--rm`, then stopped)
  - a baseline worktree in the session scratchpad (removed)
  - local `next start` servers (stopped)
- **Not touched:** the unrelated `setpoint-postgres` container.

## 4. Current Platform Lineage

This is the same graph M07 observed, re-verified now.

| Branch | Local | Remote |
|---|---|---|
| `platform/foundation-20260714` | `95cce06` | `95cce06` |
| `feature/consumer-platform-architecture` | `dc6bee2` | *(none)* |
| `feature/studiok-living-world-kernel-vertical-slice` | `23fa307` | `23fa307` |
| `feature/studiok-unreal-integration-contract-pack` | `8012814` (+1 docs over `23fa307`) | `8012814` |
| `feature/narrative-ir-adapter-non-action` | `0724feb` (+19 over `23fa307`) | none at start → **pushed** `0724feb` |

- `foundation` ⊂ `dc6bee2` ⊂ `23fa307`. There are 203 commits between foundation and `23fa307`.

## 5. R07 Preservation Result

- **State at start:** `feature/narrative-ir-adapter-non-action` was at HEAD `0724feb` with a clean worktree, and **it had not been pushed**.
- **Pushed as-is, with no rewrite:** `git ls-remote` now returns `0724feb…`.
- **R05–R07 commits:**
  - R07: `0a4583d`, `b7dd145`
  - R05/R06: `75ec447`, `884ccde`, `97817aa`
  - Prerequisites: `fef3ca4`, `40c5de1`, `40458ba`
  - These touch only `packages/narrative-ir-adapter`, `lib/worldMemory`, `package.json` and the lockfile.
- **Later commits, excluded from M09:** `7254418` … `0724feb` (StudioK narrative interpretation and episode compiler). They are the other lane's unrelated work.
- **Semantics preserved:** `first_entry`, `return_recognized` and `return_claimed_without_continuity_record`. M09 imports R07's `VisitContinuityReason` type and maps it one-to-one (§12).

## 6. Integration Lineage

**Base:** `feature/worldk-m09-platform-producers` branches from `b7dd145`, a fast-forward descendant of `23fa307`. That one lineage already contains everything M09 needs:
- living-systems, world-persistence, world-memory and world-experience contracts and runtimes
- living-world-runtime
- the Living Forest host (`lib/livingForest`)
- R05–R07

**Deliberately excluded:**
- the Unreal docs commit `8012814`
- the other lane's narrative/episode compiler commits after `b7dd145`

No merge was needed, and nothing was merged into foundation or any other lane's branch.

## 7. @avatark/world-consumer-contracts

`packages/world-consumer-contracts/`, version `1.0.0`, contract version `1.0`.

- **Ownership:** OWNER AvatarK Platform. CONSUMERS: WorldK and future approved consumer surfaces. WORLDK: consumer only.
- **`schemas/v1/`:** the 5 schemas and `living-forest-identity.json`, byte-identical to the M07 pack and to worldk-web's vendored copy. The SHA-256 values are pinned in a test.
- **Exports:** typed PublicWorldProjection, VisitorWorldProjection, SinceYouWereHere, WorldEntryIntent/Result and NarrativeContext, plus the id, freshness and significance primitives. Also `CONTRACT_OWNERSHIP` and `FORBIDDEN_CONSUMER_FIELD_NAMES`.
- **Dependencies:** it is a leaf package with zero `@avatark/*`, runtime or compiler imports (tested).
- **Distribution:** registered in `scripts/build-packages.mjs` and `scripts/pack-packages.mjs`, which produce `dist-packages`. `pnpm pack` was not run.
- **worldk-web:** its vendored pack was not modified.

## 8. Contract Conformance

`lib/worldConsumer/conformance.test.ts` validates **actual producer output** against the frozen schemas, using ajv 8 with formats loaded from the package's `schemas/v1`. The inputs are real runtime facts, not copied fixture JSON. The facts come from the Living Forest vertical slice run through its host functions:
1. an arrival encounter at tick 0
2. herd movement at ticks 1–2
3. the canopy-wet → drought season transition at tick 3, which is LANDMARK

Every output state validates: public OK, STALE, UNAVAILABLE and WORLD_NOT_FOUND, and visitor OK, UNAUTHENTICATED, WORLD_NOT_FOUND and PROJECTION_UNAVAILABLE. Referential integrity and leak scans also pass (§16 rows S–V).

## 9. PublicWorldProjection Producer

- **Code:** `lib/worldConsumer/publicProjection.ts`. The owner is the Living World Host.
- **What it does:** it re-projects each part of the contract: world, now (a world-time label with the tick kept underneath, season, day phase, conditions and processes), places (presence, conditions and the latest change), activity, history, stories and freshness.
- **History:** an aggregate read over stored World Memory events (PLT-ADR-009). NOT_SIGNIFICANT events are never stored, so they are never projected.
- **What never appears:** raw `WorldSnapshot`, `visitorContext`, `WorldLease`, entity ids, raw event ids, patch ids, or infrastructure.
- **Minted ids:** occurrence ids are `occ-<sha256>` values.
- **Unbound locations:** an event at a runtime location with no public binding is omitted rather than shown as world-wide.
- **Freshness:** the producer declares it. It is CURRENT for 60 s after `observedAt` while the source is LIVE, then STALE (`SOURCE_LAGGING`). The source status can also make it UNAVAILABLE (`SOURCE_OFFLINE` or `NOT_YET_PUBLISHED`).
- **Fixture classification:** `sourceRevision` is `fixture:living-forest-vertical-slice:<digest>` and `lifecycle` is `PREVIEW`. Nothing presents this as production Living Forest truth.

## 10. Canonical ID Binding

`lib/worldConsumer/bindings.ts` implements the binding chain: StudioK canonical place → runtime LocationId → projection `placeId`, and consumer `worldId` → runtime world id.

- **Living Forest:** `consumerWorldId: living-forest`, bound to the runtime id `living-forest-fixture`. The binding status is **FIXTURE**.
- **Places:** `forest-clearing`, `forest-stream` and `forest-pond` are all FIXTURE bindings with `canonicalPlaceId: null`. **No canon was invented.** The display names are neutral habitat descriptors.
- **PRODUCTION mode** serves only CANONICAL bindings, so Living Forest is `NOT_YET_PUBLISHED` there. FIXTURE_PREVIEW mode (`WORLD_CONSUMER_MODE=FIXTURE_PREVIEW`) must be opted into explicitly.
- **The alias `living-forest-fixture`:**
  - requesting it resolves to `WORLD_NOT_FOUND`
  - a last-line guard (`assertNoRuntimeIdentityEscapes`) plus the forbidden-field scan turn any leak into an honest unavailable response
  - it has been shown absent from every payload

## 11. Absence Ledger

- **Is migration 028 enough?** No. Its 4 tables are world-scoped (events, markers, entity memory, encounter history) and have no per-visitor continuity. It was left untouched.
- **New additive migration:** `supabase/migrations/036_world_visitor_continuity.sql`. The table is `world_visitor_continuity`, keyed by `(world_id, subject_id)`.
  - `world_id` is the consumer id.
  - `subject_id` references `auth.users(id)`, which is the same value as `IdentityClaims.subjectId`.
  - It is registered in `run-platform-migrations.js` as "NOT applied", following the 026–035 precedent.
- **Semantics, owned by SQL functions** (`record_world_confirmed_entry` and `record_world_leave`):
  - **No prior visit:** there is no row.
  - **Confirmed entry:**
    - `visit_count` goes up by one, `last_entered_at` and the entry tick are set, and the visit is open
    - `last_left_at` is cleared
    - `last_seen` becomes the entry point, with basis `ENTRY_CONFIRMED`
  - **Leave:**
    - `last_left_at` is set
    - `last_seen` becomes the last confirmed-present point, with basis `LEAVE_RECORDED`
    - a repeated leave does nothing
  - **Abnormal disconnect:** nothing is fabricated, and the basis stays `ENTRY_CONFIRMED`. `PRESENCE_TIMEOUT` is allowed by the CHECK constraint (it is an M07 enum value), but **no code path writes it**.
  - **Invariants:** a tick can never rewind, and a leave without a prior entry is rejected.
- **Access control:** RLS allows own-row SELECT only. There are no client write policies, and the functions are `REVOKE`d from PUBLIC and granted only to `service_role`.
- **Adapters** (`continuityLedger.ts`): `InMemoryContinuityLedger`, with identical semantics, and `PostgresContinuityLedger`, which calls the SQL functions. The ledger interface has **no write for browse, view or intent**.
- **Proof:** the shared suite passes against both adapters. On real Postgres 16 with 036 applied, it also covers idempotent re-apply, constraints, RLS own-row reads, and denial of function execution to clients.
- **Default route ledger:** Postgres if `WORLD_CONSUMER_LEDGER_DATABASE_URL` is set. Otherwise a process-local in-memory ledger, which is non-durable and documented as such.

## 12. VisitorWorldProjection Producer

- **Code:** `lib/worldConsumer/visitorProjection.ts`. The owner is World Memory.
- **Inputs:**
  - the verified `subjectId` (the only identity input)
  - the ledger row
  - optional prior-visit evidence from living-world-runtime `WorldState` (`priorVisitEvidenceFromWorldState`)
  - the entities the visitor encountered
- **Continuity mapping** (R07 → M07):

| R07 reason | Relationship | Return context | Since You Were Here |
|---|---|---|---|
| `first_entry` | NO_PRIOR_VISIT | FIRST_VISIT / NOT_APPLICABLE | NOT_APPLICABLE_FIRST_VISIT |
| `return_recognized` (ledger row exists) | VISITED, with `lastSeen` from the ledger | RETURNING / RECOGNIZED | derived (§13) |
| `return_claimed_without_continuity_record` (evidence but no row) | VISITED with `lastSeen: null` | RETURNING / NO_CONTINUITY_RECORD | UNAVAILABLE, reason NO_CONTINUITY_RECORD (**never** "no changes") |

- The visitor projection shares the public facts' freshness.
- One visitor's continuity never appears in another visitor's projection.

## 13. SinceYouWereHere Derivation

The inputs are durable `lastSeen.worldTick`, the World Memory events in `(lastSeen, currentTick]`, and **`computeReturnRecognition`**, the existing algorithm. It is reused for both the interval and each event's fact type, so there is no second category table.

**Grouping.** Changes are grouped per ReturnRecognition fact, and each group links to **public** history occurrences only.

**Visitor relevance** (deterministic, policy `syw-relevance@1.0`):
- **DIRECT:** an event involves an entity the visitor was present with.
- **FAMILIAR_PLACE:** an event is at a place the visitor was present at.
- **WORLD_WIDE:** a world-scale event.

Up to 5 changes are selected, ranked by relevance, then LANDMARK significance, then recency. `omittedChangeCount` counts every public occurrence in the interval that was not linked (proven by test I′). World significance is carried unchanged from World Memory.

**Contract gap (flagged, M07 unchanged).** M07 forbids `NO_MEANINGFUL_CHANGES` when changes exist, but it has no relevance value for "changed elsewhere". When public changes exist and none is personally relevant, the policy selects the top change as `WORLD_WIDE`, taking M07's wording "selected for every returning visitor" literally (test I″). A future MINOR could add a relevance value such as `ELSEWHERE`.

**Summaries.** They are deterministic templates over authorized facts. No AI or prose model is involved (enforced by the boundary test).

## 14. Service/API Boundary

| Route | Auth | Identity | Cache | Status codes |
|---|---|---|---|---|
| `GET /api/worlds/[worldId]/public-projection` | none | never read | `public, max-age=0, s-maxage=<seconds until staleAfter>`, or 10 s when not CURRENT | 200 / 404 / 503 |
| `GET /api/worlds/[worldId]/visitor-projection` | verified AvatarK session | `supabaseIdentityProvider.verifySession()` only; fails closed to UNAUTHENTICATED | `private, no-store`; `Vary: Cookie, Authorization` | 200 / 401 / 403 / 404 / 503 |

- **Structure:** the handlers live in `lib/worldConsumer/service.ts` as Web `Request` → `Response` functions with dependencies injected, and the routes only wire them. Following the bundled Next 16 route-handler docs, `params` is a Promise.
- **Proxy change:** `proxy.ts` now excludes **only** the public-projection route from the Supabase session proxy. A session refresh could otherwise put a `Set-Cookie` on a shared-cacheable response. The visitor route stays behind the proxy.
- **Ledger writes:** `confirmWorldArrival` and `recordWorldDeparture` are for the runtime host only. No route exports them, and both routes export `GET` only (tested; a POST returns 405).
- **Live proof** (the built app under `next start`, local only; Supabase env pointed at an unreachable `127.0.0.1:9`):
  - **Preview mode, public:** 200 CURRENT with `s-maxage=59`. There is no `Set-Cookie` even when a cookie is sent. The payload validates and contains no alias.
  - **Preview mode, other requests:** the alias and unknown worlds return 404. A visitor request with spoofed `subjectId`/`avatarKId`/`anon` returns 401 UNAUTHENTICATED with `private, no-store`. A POST returns 405.
  - **Default PRODUCTION mode:** the public route returns 503 `NOT_YET_PUBLISHED`.

## 15. WorldEntry Scope Boundary

WorldEntryIntent/Result v1 types ship in the package, but **no entry producer, resolver, runtime allocation, GPU, renderer, Unreal, Pixel Streaming or handoff issuer was implemented**. Arrival semantics were not needed: `returnContext` comes from the ledger. The consumer routes accept no intent.

## 16. Test Matrix

These are node:test files registered in the root `test` script.

| ID | Proof |
|---|---|
| A, B, C | `conformance.test.ts` A/B/C: public CURRENT, STALE (after the window), UNAVAILABLE (offline or missing source) |
| D | conformance D: the public payload contains no subject or visitor fields, even with continuity recorded |
| E, F | conformance E/F: places and history mapped from real events; history EMPTY |
| G, H, I, J | `visitorProjection.test.ts` G/H/I/J: first visit, no-change return, changes (DIRECT + WORLD_WIDE, LANDMARK ≠ relevance), missing continuity |
| K | `service.test.ts` K/K′: 401 unauthenticated; subject hints in the query or body, `avatarKId` and `anon` are ignored |
| L | service L: unknown world returns 404 on both APIs |
| M | conformance M: alias rejected; PRODUCTION mode returns NOT_YET_PUBLISHED |
| N | service N: repeated public and visitor reads (including viewing Since You Were Here) leave the ledger row unchanged |
| O | service O: an entry intent POST leaves the ledger unchanged; routes export GET only and contain no ledger writes |
| P, Q, R | `continuityLedgerSuite.ts`: confirmed entry, leave (LEAVE_RECORDED, idempotent), abnormal disconnect (ENTRY_CONFIRMED, never PRESENCE_TIMEOUT). Run against in-memory **and** real Postgres. |
| S, T | conformance S/T: selected changes reference public occurrences; visitor placeIds resolve against public places |
| U | conformance U + package test: no runtime, kernel, infrastructure or credential fields or strings |
| V | conformance V: every producer state validates against the frozen schemas |
| Additional tests | omitted-count honesty (I′); the "never nothing-changed" rule (I″); R07 reasons stay distinct; producer import boundary; no AI usage; checksums pinned to M07 |

**Results**

| Check | Result |
|---|---|
| `pnpm test` with the Postgres suite enabled | **1816/1816** |
| `pnpm test` without it | 1806 pass + 1 skip |
| `pnpm typecheck` | pass |
| `pnpm build` | pass (both routes compile as dynamic handlers) |
| ESLint on M09 files | clean |
| Full-repo `pnpm lint` | 7 errors + 7 warnings, all in 9 files unchanged since `b7dd145` |

**Existing intermittent failure.** `lib/worldEmbodiment/embodimentOrchestrator.test.ts` "Phase 17: two visitors …" (`vasanta`/`grishma` season mismatch) failed in 2 of 5 full M09 runs. It passes in isolation, and it also failed in 1 of 3 full runs of the **unmodified baseline `b7dd145`**. It is Living Vrindavan code that M09 does not touch.

## 17. Privacy / Security Audit

- **Rejected or never exposed** (by tests and guards): `userId`, `visitorContext`, raw runtime LocationIds, entity/group/patch ids, `WorldSnapshot`, `WorldLease`, `simulationTick`, runtime instance, GPU, machine, region, renderer, Unreal process, service credentials.
- **Visitor API identity:** it trusts only the verified session. It never uses a `subjectId` from the query or body, an `avatarKId`, or `anon`.
- **Public payloads:** they never read cookies and can never carry `Set-Cookie`.
- **Secret scan:** it covered all 3770 added lines in `b7dd145..HEAD` and found no JWT, Supabase key or URL, GitHub token, AWS key, PEM, or Postgres URL with a password.
  - **Honesty note:** the first scan command failed on a regex engine error, and my command chaining let the branch push run before a clean scan result existed. The scan was then re-run correctly on the pushed diff, and it was clean.
- **Local proof credentials:** the throwaway Postgres password and dummy Supabase env were used only locally and are not in any committed file.

## 18. Database Mutation Audit

- **Production/shared Supabase:** zero mutations. No credentials were present in the worktree (only `.env.example`).
- **Migration 036:** applied **only** to the disposable local container `worldk-m09-ledger-pg`, which has since been removed.
- **Migration runner:** not executed.

## 19. Other-Repository Mutation Audit

The audit compared each repo against the session baseline.

- **worldk-web:** `d0ac970`, clean, and identical to its remote. Zero mutations.
- **Unchanged:** StreamK, arenak, gamek, prometheusk, cinemak, avatark-web, living-os, studiok-specifications, and the compiler (`036d2cc`).
- **Other avatark-platform-web worktrees:** unchanged, including the primary (`dc6bee2`, same 9 dirty entries) and the narrative-ir-adapter worktree (`0724feb`, clean).
- **Changed by the other lane, not by M09:**
  - `studiok-platform`: `c43371a` → `aeae957` ("adr: ratify certification invocation authority contract", 20:11 UTC)
  - `~/dt4m-os`: dirty count 68 → 70 (`STUDIOK_UI_M1_G10M_*` reports, 19:36 and 20:12 UTC)

  Both are the other lane's StudioK G10M work.
- **Process-kill mishaps:** twice, a `pkill -f`/`pgrep -f` with a broad pattern also matched its own shell. The kill was scoped to processes whose working directory was the M09 worktree, so no other lane was affected. The remaining processes were stopped by PID.

## 20. Git / Remote Evidence

| Commit | Message |
|---|---|
| `5401254` | feat(world-consumer-contracts): add @avatark/world-consumer-contracts v1 package |
| `736eaed` | feat(worldMemory): durable visitor/world absence ledger (migration 036) |
| `a321ca1` | feat(worldConsumer): canonical id binding boundary and PublicWorldProjection producer |
| `c5809f0` | feat(worldMemory): VisitorWorldProjection and SinceYouWereHere producer |
| `69b0a94` | feat(api): WorldK consumer service boundary and projection routes |
| `7cd1cf4` | test(worldConsumer): producer conformance, ledger, privacy and API boundary tests |
| *(this report)* | docs(evidence): M09 report |

- `origin/feature/worldk-m09-platform-producers` was `7cd1cf4` at the code push. The report commit follows.
- `origin/feature/narrative-ir-adapter-non-action` is `0724feb`, preserved.
- Nothing was merged into foundation.

## 21. Remaining Blockers

1. **Canon:** there is no Living Forest canon, so no CANONICAL bindings exist. PRODUCTION therefore stays `NOT_YET_PUBLISHED`. This needs StudioK canon plus the binding table.
2. **Migration 036:** it has not been applied to any shared or production database, which needs separate authorization. Until then the default ledger is process-local in-memory.
3. **Runtime callers:** no Living Forest runtime host yet calls `confirmWorldArrival` / `recordWorldDeparture`. That needs the entry resolver and runtime session, which are later missions.
4. **Presence:** no presence heartbeat exists, so continuity uses the conservative `ENTRY_CONFIRMED` basis.
5. **Visitor evidence:** Living Forest has no participation or visit store wired, so `encounteredEntityIds` and prior-visit evidence default to empty in the routes. The adapters exist.
6. **Fact source:** the facts are a fixture timeline computed once per process. A durable world-instance fact source is still needed.
7. **Product registry:** the `worldk` registry entry and product-access gating (the UNAUTHORIZED path) are not implemented.
8. **Contract gaps (M07 minor):**
   - there is no freshness reason for "signed out" (M09 follows the M07 anonymous fixture's `NOT_YET_PUBLISHED`)
   - there is no relevance value for "changed elsewhere" (§13)
9. **Landing:** the branch still has to land on foundation after review. The other lane's `consumer-platform-architecture` must settle first.

## 22. Exact Next Mission

**WORLDK-M10-LIVE-WORLDK-CLIENT-PREVIEW-01.** Implement `LiveWorldKClient` in worldk-web against these two platform routes:
- run it in FIXTURE_PREVIEW
- keep `FixtureWorldKClient` for tests
- cover freshness, the absence states and CORS/origin handling
- no UI redesign
- still no entry resolver

A parallel platform mission would handle the entry resolver and runtime-confirmed arrival wiring (`confirmWorldArrival`). Applying migration 036 to a platform test database needs separate explicit authorization.

## Final Classification

```
WORLDK_M09_PLATFORM_PRODUCERS_CERTIFIED

PLATFORM_BRANCH             = feature/worldk-m09-platform-producers (avatark-ai/avatark-platform-web)
PLATFORM_HEAD               = 7cd1cf4 (code); evidence-report commit follows
R07_PRESERVED               = YES (feature/narrative-ir-adapter-non-action @ 0724feb pushed; R05-R07 in M09 lineage via b7dd145)
CONTRACT_PACKAGE            = @avatark/world-consumer-contracts
CONTRACT_VERSION            = 1.0
PUBLIC_PROJECTION_PRODUCER  = lib/worldConsumer/publicProjection.ts (fixture-backed Living Forest facts; PREVIEW)
VISITOR_PROJECTION_PRODUCER = lib/worldConsumer/visitorProjection.ts
ABSENCE_LEDGER              = migration 036 + InMemory/Postgres adapters (local Postgres proof only; not applied to shared DB)
SINCE_YOU_WERE_HERE         = durable lastSeen + computeReturnRecognition + syw-relevance@1.0
PUBLIC_API                  = GET /api/worlds/[worldId]/public-projection
VISITOR_API                 = GET /api/worlds/[worldId]/visitor-projection
WORLD_ENTRY_LIVE            = NO
PRODUCTION_DB_MUTATION      = NO
WORLDK_MUTATION             = NO
STREAMK_MUTATION            = NO
STUDIOK_MUTATION            = NO
DEPLOYMENT                  = NONE
NEXT_MISSION                = WORLDK-M10-LIVE-WORLDK-CLIENT-PREVIEW-01
```
