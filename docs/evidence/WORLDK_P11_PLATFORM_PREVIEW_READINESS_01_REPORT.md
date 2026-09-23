# WORLDK-P11-PLATFORM-PREVIEW-READINESS-01 — Report

Date: 2026-09-23
Lane: AvatarK Platform (separate from WorldK). WorldK was read-only.
Branch: `feature/worldk-p11-platform-preview` (from `feature/worldk-m09-platform-producers` @ `55a3fbe`)

**Final classification: `WORLDK_P11_PLATFORM_PREVIEW_BLOCKED`**

## 1. Executive Summary

- **Done:**
  - The migration number collision is resolved: M09's continuity migration is now `037`.
  - An isolated preview lineage exists: M09 plus one renumber commit and this report.
  - The M09 producers are unchanged.
  - Typecheck and build are green. Tests are 1816/1816, including the Postgres ledger suite against migration 037.
- **Blocked:** remote acceptance. Three infrastructure facts, all verified, prevent it:
  1. **No non-production database exists.** The platform Vercel project's Preview and Production targets share the same `NEXT_PUBLIC_SUPABASE_URL` and anon key. The only platform Supabase project backs `next.avatark.ai` (production). Applying the continuity schema there would be a production DB mutation. No service-role key is configured for any target, and this session holds no Supabase management credential to provision a separate test project.
  2. **No separate preview/test auth environment exists.** For the same reason, a "preview session" today is a production Supabase Auth session. Creating a test visitor there would be a production auth mutation.
  3. **Preview origins are not reachable server-to-server.** The project has `ssoProtection = all_except_custom_domains` and no Protection Bypass for Automation. Every `*.vercel.app` preview answers `302 → vercel.com/sso-api`. A WorldK Vercel preview cannot call it without a bypass secret or a custom preview domain.
- **Not done in P11:** none of these three were overridden. Each needs an owner decision about shared infrastructure; see §23.

## 2. Mission Classification

This is platform preview infrastructure readiness. It is not WorldK UI, production deployment, runtime entry, Unreal, Pixel Streaming or a Living Forest launch. None of those were touched.

## 3. Pre-flight / Lane Safety

- `git worktree list`: 39 platform worktrees were inventoried. The two relevant ones:
  - `avatark-platform-web-worldk-m09` at `55a3fbe` (`feature/worldk-m09-platform-producers`): clean, pushed.
  - `avatark-platform-web-narrative-ir-adapter` at `f4d7c03` (`feature/narrative-ir-adapter-non-action`): **clean**. The certification work that M10 saw as uncommitted is now committed there as `f4d7c03`, "feat(certification): add durable attested certification authority". It is **not pushed**: origin is still at `0724feb`.
- Nothing in either lane was touched, stashed, reset, cleaned, renamed or committed. Both were re-verified at the end: same HEADs, 0 dirty files.
- P11 worktree: `~/workspace/avatark-platform-web-worldk-p11`, created with `git worktree add -b feature/worldk-p11-platform-preview … 55a3fbe`.

## 4. M09 Baseline

The baseline is `55a3fbe`, whose merge-base with `f4d7c03` is `b7dd145`. M09 does **not** contain the R07 narrative commits (`7254418..0724feb`) or the certification commit. The M09 producers, `@avatark/world-consumer-contracts` v1.0 and the M07 semantics are carried forward unmodified.

## 5. Migration Collision Resolution

| Migration | Lineage | Published? | Applied anywhere shared? |
|---|---|---|---|
| `036_world_visitor_continuity.sql` | M09 (`736eaed`) | pushed (origin M09 branch) | no (disposable local PG only) |
| `036_certification_authority.sql` | narrative-ir-adapter (`f4d7c03`) | local commit only | no (ephemeral PG only) |

The highest migration on every local and remote ref is `035_participation.sql`, apart from the two 036s above.

- **Decision:** the P11/M09 lineage takes `037`. The certification lineage keeps `036` and is expected to land first, since it sits on the R05–R07 narrative chain and M09 is older than it. With 037, both lineages combine collision-free in either landing order. The migration runner orders by explicit list and Supabase orders lexically, so a temporary gap at 036 is harmless.
- **What changed (commit `6f982d5`):**
  - `git mv` of the file to `037_world_visitor_continuity.sql`.
  - References updated in `continuityLedger.ts`, `continuityLedger.postgres.test.ts`, `runtimeDeps.ts` and `run-platform-migrations.js`, with a comment reserving 036.
- **Semantics unchanged:** sha256 is `5c7915e5aabf19e7e331e406ae0d6b3067955a3cc47b71709ee595b635b751bc` both before and after.
- **Other lane:** its migration was not edited.
- **M09 report:** it still says "036". It is left unchanged as historical evidence, and this report is the erratum.

`MIGRATION_COLLISION_RESOLVED = YES`

## 6. Preview Branch / Lineage

`feature/worldk-p11-platform-preview` = `55a3fbe` + `6f982d5` (renumber) + this report. It absorbs no unrelated platform work.

## 7. Test Database

- **Remote non-production DB: NONE AVAILABLE (blocker 1).** Vercel project env (names and targets only, values never read):
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED` each cover `[production, preview]`, with no branch-scoped overrides.
  - `ONBOARDING_RECEIPT_SECRET` covers `[production]` only.
  - `SUPABASE_SERVICE_ROLE_KEY` and `WORLD_CONSUMER_LEDGER_DATABASE_URL` are absent.
- **Local proof only:** the continuity schema was applied to a disposable `postgres:16` container (`worldk-p11-ledger-pg`, 127.0.0.1:55441), which has since been stopped and removed with `--rm`. With `WORLD_CONSUMER_TEST_DATABASE_URL` set, it proved:
  - clean and idempotent apply
  - the ledger functions (P/Q/R entry, leave and abnormal-disconnect semantics)
  - world time never rewinds continuity
  - (worldId, subjectId) keying
  - constraints
  - RLS own-row reads
  - clients cannot write or execute the ledger functions
- **Not done:** the schema was **not** applied to any remote DB.

`TEST_DB = LOCAL_DISPOSABLE_ONLY` · `VISITOR_CONTINUITY_SCHEMA = 037 proven locally, not applied remotely`

## 8. Authentication

The visitor route still derives `subjectId` only from the verified AvatarK session. This is M09 code, unchanged and covered by `boundary.test.ts` and `service.test.ts`. The only shared AvatarK auth that exists is the production Supabase project, so there is no preview/test auth environment to use (blocker 2). No second identity authority was invented.

`AUTH_VERIFIED = NO (remote)`

## 9. Preview Deployment Architecture

The established convention is the GitHub → Vercel integration on project `avatark-platform-web` (`prj_RPbc…pe0A`, production branch `platform/foundation-20260714`, production domain `next.avatark.ai`). Every pushed feature branch receives an automatic Vercel Preview deployment. For example, M09 `55a3fbe` is at `avatark-platform-6omor3q64-avatark.vercel.app` and is READY.

Pushing the P11 branch therefore produces a platform **Preview** deployment through that existing pattern. No new hosting architecture was introduced. Its behavior:

- `WORLD_CONSUMER_MODE` is unset, so the default mode is `PRODUCTION`.
- Living Forest answers `503 PROJECTION_UNAVAILABLE / NOT_YET_PUBLISHED`. This is the safe, honest default, so no production-world claim is possible.
- No branch-scoped env vars were set. Setting `WORLD_CONSUMER_MODE=FIXTURE_PREVIEW` and a ledger URL is pointless until blockers 1 and 3 are resolved.

## 10. Preview Origin

The per-deployment `*.vercel.app` URLs exist over HTTPS, but they are SSO-gated:

`curl https://avatark-platform-6omor3q64-avatark.vercel.app/api/worlds/living-forest/public-projection` → `302` to `vercel.com/sso-api`.

`protectionBypass` is not configured. There is no stable, non-SSO, non-production origin. The per-deployment URL is not stable either; a branch alias would be.

`PREVIEW_ORIGIN = NONE (SSO-gated per-deployment URLs only)`

## 11. Public Projection Remote Proof

**Not performed: the origin is unreachable (blocker 3).** Local evidence carried from M09/M10:
- It validates against M07 v1.
- Lifecycle is PREVIEW under FIXTURE_PREVIEW.
- It is anonymous and public-cacheable.
- The fixture alias does not escape.
- An unknown world returns 404.

## 12. Visitor Projection Remote Proof

**Not performed (blockers 1–3).** Local evidence carried from M09/M10:
- Unauthenticated requests get 401.
- Responses are `private, no-store`.
- `subjectId` is derived on the server.
- A visitor cannot access another visitor's continuity.

## 13. Continuity Test Harness

`confirmWorldArrival` and `recordWorldDeparture` are server-only functions in `lib/worldConsumer`. The Postgres functions are denied to `anon` and `authenticated`, as proven by the RLS test. No platform test/admin route invokes them, and none was added.

- **Current setup method:** test continuity is established only through the test harness (the `PostgresContinuityLedger` in tests, or direct SQL as the service role on a test DB).
- **Consumer write endpoints:** none were exposed. WorldK remains read-only with respect to continuity.

`CONTINUITY_WRITER = TEST_HARNESS_ONLY; runtime writer remains a blocker`

## 14. Runtime Writer Status

There is no certified platform caller of `confirmWorldArrival` yet. P11 implemented no WorldEntry resolver, GPU, Unreal or Pixel Streaming work, and no runtime handoff.

`WORLD_ENTRY = NOT_LIVE`

## 15. Product Registry Status

- **Status: no `worldk` entry, deferred.** `packages/product-registry` has no environment axis: `AvatarKProduct` has `status`, `visibility`, `domain` and `previewDomain`, but no per-deployment environment field. Any entry added is compiled into every build of this app, and ~40 app sites iterate the registry (switcher, health, capability matrix). The required `environment = preview` semantics therefore cannot be expressed without affecting behavior once merged.
- **Exact required change, for the registry governance lane:** add an entry with:
  - `id: 'worldk'`, `status: 'internal'`, `visibility: 'internal'`
  - `domain: null`, `previewDomain: null` until a fixed preview alias exists
  - `repository: 'worldk-web'`, `integrationStatus: 'in-development'`
  - `supportsAuth: true` only after a WorldK preview is proven on shared auth
  - all other capability flags `false`

  It must not claim `worldk.ai`.

## 16. Redirect-Allowlist Status

WorldK signs in with `signInWithOtp` and `emailRedirectTo = <origin>/auth/callback?returnTo=…` (read-only inspection of `worldk-web/app/auth/sign-in/SignInForm.tsx`).

- **Required for M12:** add the WorldK preview callback `https://<worldk-preview-origin>/auth/callback` to the Supabase Auth redirect allowlist of whichever auth project preview uses. Use the exact branch alias, not a broad wildcard.
- **Why nothing was added now:** no WorldK Vercel project exists, so there is no origin to add, and no production WorldK domain may be added.

`REDIRECT_ALLOWLIST = DEFERRED_TO_M12 (requirement recorded)`

## 17. Contract Conformance

`packages/world-consumer-contracts/src/contracts.test.ts` and `lib/worldConsumer/conformance.test.ts` pass locally. The schemas are M07 v1, byte-identical and unchanged; there is no v1.1. A remote conformance run was not possible (blocker 3). Known deferred gaps remain: no ELSEWHERE visitor relevance and no SIGNED_OUT freshness reason.

`CONTRACT_VERSION = M07 v1`

## 18. Security Audit

- **No new surface:** P11 adds no route, env var, CORS rule or cache header.
- **Local coverage:** `boundary.test.ts` passes. It covers no infrastructure fields in projections, no subject ids in the public projection, no auth cookie on the public route, `private, no-store` on the visitor route, and no wildcard credentialed CORS.
- **Secrets:** none were printed, committed or copied. Vercel env was inspected by name and target only.
- **Remote audit:** not possible.

## 19. Test Results

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile --prefer-offline` | ok |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 1: 14 problems (7 errors, 7 warnings), **identical** to the M09 baseline `55a3fbe` (diffed); none in P11-touched files |
| `WORLD_CONSUMER_TEST_DATABASE_URL=… pnpm test` | **1816/1816 pass**, 0 fail/skip. Includes 10 `postgres … (migration 037)` tests on disposable PG16. The known `embodimentOrchestrator` "Phase 17" flake did not trigger |
| `pnpm build` | exit 0; `/api/worlds/[worldId]/{public,visitor}-projection` present |
| Remote smoke tests | **not run**: no reachable origin |

## 20. Deployment Evidence

- **Deployment:** pushing `feature/worldk-p11-platform-preview` triggers the existing Vercel Git integration, which creates a Preview (non-production) deployment in PRODUCTION consumer mode, gated by SSO.
- **Not changed:** no production deployment, no Vercel project settings, no env vars, no DNS.

## 21. WorldK Mutation Audit

`~/workspace/worldk-web` was only read: `git status/log/branch` and a grep of `SignInForm.tsx` and `lib/worldk`. M11 is active there, on `feature/worldk-m11-experience-acceptance` with uncommitted changes, and was not touched. `WORLDK_MUTATIONS = ZERO`

## 22. Other-Lane Mutation Audit

| Lane | State |
|---|---|
| narrative-ir-adapter | `f4d7c03`, clean before and after |
| worldk-m09 | `55a3fbe`, clean before and after. Lint was run there as a read-only baseline and changed no tracked files |

StreamK, dt4m-os and the StudioK compiler were not touched. `OTHER_LANE_MUTATIONS = ZERO`

## 23. Remaining Blockers

Each blocker needs an owner decision:

1. **Non-production Supabase project**, for both the test DB and preview/test auth. Create a separate project such as `avatark-platform-preview`. Then set **branch-scoped Preview** env vars on `avatark-platform-web` for `feature/worldk-p11-platform-preview` only:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (preview project)
   - `WORLD_CONSUMER_MODE=FIXTURE_PREVIEW`
   - `WORLD_CONSUMER_LEDGER_DATABASE_URL` (preview project, server-only)

   Then apply `001–035` plus `037` with `run-platform-migrations.js`, which already asserts a platform *test* DB. Alternatively, the owner designates an existing project as non-production.
2. **Server-to-server reachability.** Either enable Vercel *Protection Bypass for Automation*, with the secret stored only as a WorldK server env var, or attach a custom non-production domain such as `platform-preview.avatark.ai`. Custom domains are exempt from `all_except_custom_domains`. This changes shared project settings.
3. **Runtime arrival writer.** This is still a separate mission.

## 24. Exact Next Mission

**WORLDK-P11B-PLATFORM-PREVIEW-PROVISIONING-01.** Once blockers 1–2 are resolved by the owner:
- set the branch-scoped env vars
- apply migrations to the preview DB
- create test visitors in the *preview* auth project
- seed continuity through the test harness
- run the §10–§12 and §16–§17 remote proofs against the stable preview origin

After that, WORLDK-M12 (the WorldK Vercel preview) can proceed.

```
WORLDK_P11_PLATFORM_PREVIEW_BLOCKED
PLATFORM_PREVIEW_BRANCH       = feature/worldk-p11-platform-preview
MIGRATION_COLLISION_RESOLVED  = YES (M09 migration -> 037, byte-identical)
TEST_DB                       = NONE REMOTE (local disposable PG16 proof only)
VISITOR_CONTINUITY_SCHEMA     = 037, not applied remotely
PREVIEW_ORIGIN                = NONE (Vercel previews SSO-gated, no bypass)
PUBLIC_PROJECTION_REMOTE      = NOT PROVEN
VISITOR_PROJECTION_REMOTE     = NOT PROVEN
AUTH_VERIFIED                 = NO (no non-production auth environment)
CONTRACT_VERSION              = M07 v1 (unchanged)
LIFECYCLE                     = PREVIEW under FIXTURE_PREVIEW; default PRODUCTION mode -> NOT_YET_PUBLISHED
CONTINUITY_WRITER             = TEST_HARNESS_ONLY
PRODUCT_REGISTRY              = DEFERRED (exact change documented)
REDIRECT_ALLOWLIST            = DEFERRED_TO_M12
WORLD_ENTRY                   = NOT_LIVE
PRODUCTION_DB_MUTATION        = ZERO
WORLDK_MUTATION               = ZERO
PRODUCTION_DEPLOYMENT         = ZERO
NEXT_MISSION                  = WORLDK-P11B-PLATFORM-PREVIEW-PROVISIONING-01
```
