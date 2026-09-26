# WORLDK-M14-B3 — Stream Connection Capability Authority + Preview Stub Signalling Authorization

**Date:** 2026-09-26
**Lane:** Platform (`avatark-platform-web`, branch `feature/worldk-p11b-platform-preview-provisioning`)
**Implementation commit:** `0efb04c` (pushed; B2 base `b5cc866`)
**Preview DB:** `avatark-platform-preview` (`gxjdbfpyyrycvqzozyty`). Migration 043 applied 19:06:33Z.
**Platform Preview:** `dpl_8Z9Bc7irusr8T6HnGEe4fjKfBmsT` READY, aliased to `platform-preview.avatark.ai`
**Classification:** `M14B3_STREAM_CAPABILITY_AUTHORITY_CERTIFIED` (scope and limits in §9)

B1 and B2 are frozen and untouched. WorldK, Production and GCP L4 were not touched. There is no Pixel Streaming, Unreal, TURN/STUN, renderer/GPU allocation or media. B0 physical topology stays **UNFROZEN**. B4 is not started.

---

## 1. Reconnaissance
- **Migration ledger:** the repo lineage ends at 042. No branch (local or `origin/*`), worktree or file on this box uses 043–049. On Preview, `schema_migrations` held 039–042 and no 043 before the apply. **043 was free; no collision.**
- **Authority model reused (040):**
  - The session gate is `world_m14_assert_platform()`: the session user must be able to SET ROLE `worldk_platform_entry_authority`.
  - The Platform credential is `worldk_platform_entry_preview` (NOINHERIT, SET-only).
  - `world_m14_lock(world, subject)` serialises with every lifecycle writer.
- **"Authenticated subject" on the gateway origin:** the Platform origin has no Supabase session. The browser is authenticated by its RuntimeSession's status-page capability, the HttpOnly `__Host-wk-entry` cookie. That cookie is minted at single-use ticket redemption and stored as `view_sha256`. The session row supplies session, subject and world, so **no caller ever names a subject.**
- **The Leave-fix pattern applies:** strict Origin on same-origin POSTs, and `Referrer-Policy: same-origin` on the page that issues them.

## 2. Design (smallest surface)
**Migration `043_world_stream_capability_authority.sql`** (Preview-only; the runner refuses it for any other project ref):

| Object | Purpose |
|---|---|
| `world_stream_capabilities` | `capability_sha256` PK (32 bytes). Bindings: `session_id` (FK to `world_runtime_sessions`), `subject_id`, `world_id`. Timestamps: `issued_at`, `expires_at`, `consumed_at`. `authorization_sha256` is UNIQUE and inert in B3. **No plaintext column.** |
| CHECK `…_ttl` | `expires_at = issued_at + 60 s`. The TTL cannot be lengthened, even by the owner. |
| CHECK `…_consumed`, `…_consumed_in_window` | Single use: consumed ⇔ authorization hash present. Consumption must fall inside [issued, expires). |
| `world_m14b3_session_in_world(session)` | Internal, **read-only**, STABLE. EXECUTE is revoked from everyone. |
| `world_stream_capability_issue(view_sha256, capability_sha256)` | Gate, lock, IN_WORLD check, then insert the hash. Takes **no** subject, session or world parameter. At most 5 outstanding capabilities per session. |
| `world_stream_capability_redeem(capability_sha256, view_sha256, world_id, authorization_sha256)` | Gate, lock, `FOR UPDATE`, then checks consumed, expired, binding (session + subject + world) and IN_WORLD, then consumes. Every refusal RAISEs, so a refused attempt writes nothing and **neither consumes nor burns** the capability. |

**The IN_WORLD predicate** is stricter than the status page and never infers a timeout, so the stream path is never a lifecycle writer. All of these must hold:
- The session is not ended, no leave has been requested, and it has joined (runtime ARRIVAL accepted).
- The presence row is open **and** within the world's presence grace.
- 039 continuity is open for exactly this visit.
- The allocation is not released.
- The instance is ACTIVE.

**Privileges (the 038 lesson):**
- `REVOKE ALL` on the table and all three functions from PUBLIC, anon, authenticated and service_role.
- RLS is enabled with no policies.
- `GRANT EXECUTE` on only the two entry points, to `worldk_platform_entry_authority`.
- SECURITY DEFINER with `search_path = pg_catalog, public`.

**Gateway (`lib/worldEntry/streamCapability.ts`).** These routes answer on `platform-preview.avatark.ai` only and 404 on any other host. They are added to the M12 self-authenticating path list:
- `GET /world-entry/stream` is the stub page. Its CSP pins the inline script by sha256 (`connect-src 'self'`, `form-action 'none'`) and it sends `Referrer-Policy: same-origin`. It shows only the outcome; the capability and authorization never reach the DOM.
- `POST /world-entry/stream/capability` takes an empty JSON body `{}`. Extra keys, such as a `subjectId`, get 400. Success returns `201 {status:"ISSUED", capability, worldId, expiresInSeconds:60}`.
- `POST /world-entry/stream/authorize` is the **stub signalling** endpoint. It takes `{capability, worldId}` plus the session cookie and returns `200 {status:"AUTHORIZED", authorization}`. The `authorization` value is opaque, and only its hash is stored.
- **Strict Origin:** the Origin header must be present and equal to the gateway origin; absent, `null` and foreign values are refused. `Sec-Fetch-Site`, when sent, must be `same-origin`. `Content-Type` must be `application/json`. Bodies are capped at 1 KiB.
- **Refusals:** every authority refusal is the same opaque `403 {"status":"REFUSED"}`. Infrastructure failure returns 503. Nothing is logged.
- **Nothing sensitive is returned:** no renderer, signalling, TURN or GPU value and no DB/runtime identifier.

`PgEntryAuthorityDb` gains `streamCapabilityIssue` / `streamCapabilityRedeem`. The `EntryAuthorityDb` interface is unchanged, so no M14-A, B1 or B2 implementer is affected.

## 3. Required negative proofs (real Postgres, `streamCapability.postgres.test.ts`, 14/14)
The Supabase-shaped DB applies 037–040 and then 043 as the non-superuser owner. Its default privileges grant anon, authenticated and service_role everything, as a real Supabase project does. All calls go through the real handlers and the Platform credential. The IN_WORLD sessions come from the real path: ENTER, handoff, then reference-runtime ARRIVAL.

| Requirement | Test | Result |
|---|---|---|
| Positive: IN_WORLD → issue → atomic consume → opaque AUTHORIZED | P1 | Row bound to session, subject and world, TTL exactly 60 s, hash only. The response holds only `{authorization,status}` with no ids. The public-schema digest is unchanged. |
| Issuance without IN_WORLD refused | N1 | WAITING, CLAIMED-not-joined, LEAVING, LEFT, ENDED (disconnect) and presence-expired-unswept all get `STREAM_SESSION_NOT_IN_WORLD`. An unknown session gets `SESSION_NOT_FOUND`. The expired case wrote nothing, so no timeout was inferred. |
| Issuance for another subject refused | N2 | Bodies naming a subject, session or world get 400, and no row is written. The function signature is `p_view_sha256 bytea, p_capability_sha256 bytea`. The subject always comes from the session. |
| Wrong Origin refused | N3 | Foreign, cross-site, `null`, http-downgrade, same-site and absent Origin all get 403. The capability stays unconsumed and still works for its owner afterwards. |
| Malformed / forged refused | N4 | A forged well-formed capability, a session cookie presented as a capability, bad lengths and bad JSON all get `STREAM_CAPABILITY_INVALID`, 403 or 400. |
| Expired refused | N5 | `STREAM_CAPABILITY_EXPIRED`. The schema rejects lengthening the TTL. |
| Second redemption refused | N6 | `STREAM_CAPABILITY_CONSUMED`. The replay changed nothing. |
| Concurrent double redemption: exactly one wins | N7 | **Held-lock proof:** T1 redeems inside an open transaction. T2 is observed waiting on a Lock in `pg_stat_activity`, then gets `STREAM_CAPABILITY_CONSUMED` after T1 commits. **Race:** 16 attempts over 8 independent pools gave 1 AUTHORIZED and 15 CONSUMED. |
| Subject / session / world mismatch refused | N8 | Four cases all get `STREAM_CAPABILITY_BINDING_MISMATCH` and consume nothing: another subject's live session, the same subject's reconnected (different) session, a wrong world, and no session. A reconnect requires a **new** capability from the current session, which works. |
| Ended / departed session cannot obtain or use a capability | N9 | Leave-requested, departed (runtime DEPARTURE), presence-expired, swept (PRESENCE_TIMEOUT), disconnected and instance-revoked all get `STREAM_SESSION_NOT_IN_WORLD`, for both use and issue. |
| Capability cannot call M14 lifecycle authority | N10 | The capability hash is refused as a ticket (`TICKET_INVALID`), as a session view or leave (`SESSION_NOT_FOUND`) and as a runtime secret (`RUNTIME_CREDENTIAL_INVALID` on poll, arrival and departure). As an ingress Bearer it gets 401; as the gateway cookie it gets 404. The digest is unchanged. |
| Capability cannot mutate world state / continuity | N11 | Issue, redeem and replay three times, plus a forged issue: the digest over every public table except the capability store is identical, and so is the continuity row. Statically, 043 writes only `world_stream_capabilities` and calls no `world_m14_*` lifecycle helper, `record_world_*` function or `*_v2` writer. |
| Privileges | N12 | No table grants except the owner. RLS is on with 0 policies. anon, authenticated, service_role and PUBLIC have no EXECUTE or table privilege, even via `SET ROLE`. The NOINHERIT credential has nothing without SET ROLE. The owner session is refused (`AUTHORITY_INVALID`). The Platform role gained exactly `{issue, redeem}`. |
| Plaintext absent from persistent storage | N13 | 27 plaintexts (capabilities and authorizations) were checked against every `public` and `auth` table and `pg_stat_activity`: **0 hits**. Their hashes are present. |

**Mutation check.** Each mutant was applied, the suites were run, and the originals were restored and verified with `diff`. All 7 were killed:

| Mutant | Caught by |
|---|---|
| no single-use | N6, N7 |
| no presence freshness | N1, N9 |
| no subject/session binding | N8 |
| anon table grant left | N12 |
| leave-requested ignored | N1, N9 |
| Origin optional | N3 and the unit test |
| no expiry check | N5 |

## 4. Browser proof (real Chromium 151 + real handlers + real Postgres, `streamCapability.browser.test.ts`, 1/1)
Chromium produces Origin, Sec-Fetch-Site and cookies itself; none are hand-set.

1. **Before ARRIVAL** (WAITING), the stub page gets REFUSED.
2. After the runtime ARRIVAL, the stub page gets **AUTHORIZED**. The server saw the capability request (201) and then the authorize request (200). Both carried the real Origin, `same-origin` and the session cookie. No plaintext was in the DOM.
3. **In-page replay and race:** two concurrent redemptions returned `[200, 403]`, and the replay returned 403.
4. **Origin-null mutant:** a same-origin **form** POST from a page served with `no-referrer` makes Chromium send `Origin: null`. It was refused with 403 and nothing was issued.
5. **Cross-site attacker** (127.0.0.1 origin):
   - CORS-preflighted fetches were **BLOCKED** and never reached the handlers.
   - Two text/plain form POSTs reached the Platform with a cross-site Origin and **no cookie** (SameSite=Lax), and both got 403. Nothing was issued.
6. **After Leave and runtime DEPARTURE**, the page gets REFUSED.
7. DB plaintext scan: 0 hits.

**Observation (corrects an assumption from A3):** under `Referrer-Policy: no-referrer`, Chromium 151 **still sends the real Origin on a same-origin `fetch()` POST**. Only form navigations serialize it as `null`. The stub page's `same-origin` policy is therefore defence in depth, not load-bearing, and the null-Origin refusal is proven with a form-based mutant.

## 5. Preview apply and audit (real Supabase)
- **Pre-snapshot (read-only):** ledger 039–042, 043 absent. The lifecycle digest over allocations, continuity, credentials, events, instances, policies, presence, receipts, sessions and tickets is identical to A4's pre-042 values.
- **Apply:** `supabase db query --linked` ran as postgres in **one transaction**: the 043 file byte-for-byte, then the runner-format ledger row, checksum `180016d8e40e7c11a64e52aa569a5a531407591bcb731a43e02a971518c617f9`, which is the sha256 of the committed file. Applied at 19:06:36Z.
- **Post-apply:** the lifecycle digest is **unchanged**.
- **Audit on real Supabase:**
  - RLS is on with 0 policies. No table grants exist for anyone except the owner `postgres`.
  - anon, authenticated, service_role and the NOINHERIT credential all have no table privilege and no EXECUTE, and PUBLIC has no EXECUTE.
  - `worldk_platform_entry_authority` has EXECUTE on exactly issue and redeem, and not on the predicate.
  - All three functions are SECURITY DEFINER with a pinned search_path.
  - All eight constraints are present.
  - 0 rows.
  - The audit files are `worldk-m14b3/preview-{pre-043,post-043,audit043}.json`.

## 6. Deployed Preview probes (Platform-only; no bypass, no WorldK, no real session)
These ran on `dpl_8Z9Bc7irusr8T6HnGEe4fjKfBmsT` (alias to `0efb04c`). The raw output is `worldk-m14b3/preview-deployed-probes.txt`.

| Probe | Result |
|---|---|
| GET stub page, no cookie | 404 |
| issue: no Origin / `Origin: null` / foreign cross-site / no cookie | 403 REFUSED ×4 |
| issue with `{"subjectId":…}` body | 400 MALFORMED |
| **issue: correct Origin + well-formed forged session cookie** | **403 REFUSED.** Every pre-check passed, so this is the live 043 function answering `SESSION_NOT_FOUND` through the Platform credential. A missing function or unavailable DB would give 503. |
| **authorize: forged capability + forged cookie** | **403 REFUSED** (043 `STREAM_CAPABILITY_INVALID`) |
| authorize: malformed capability / form-encoded body | 403 / 400 |
| Production host `next.avatark.ai` stream page / issue | 404 / 404 (Production is still `dpl_FdYo7Sr2mq9322hgQkzqtvwa18kW`) |
| Runtime ingress unauthenticated poll | 401 (unchanged) |
| Stub page headers | CSP with the script hash, `Referrer-Policy: same-origin`, `Cache-Control: private, no-store` |

After the probes, Preview had **0** capability rows and an **unchanged** lifecycle digest (`preview-post-probe.json`).

## 7. Regression
| Suite | Result |
|---|---|
| B3 unit (`streamCapability.test.ts`) | 8/8 |
| B3 real Postgres | 14/14 (also 14/14 on the pg_cron cluster, both alone and concurrently with A5) |
| `pnpm test:browser` (Leave + B3) | 5/5 |
| **`pnpm test` (full, with the disposable DB)** | **1951 pass / 1 fail / 4 skipped of 1956.** The one failure is the known pre-existing flake `embodimentOrchestrator.test.ts` "Phase 17": in isolated reruns it failed 1 of 3 and passed 2 of 3, and it is unrelated to B3. Of the skips, 1 is the optional PostgREST stack and 3 are the A5 pg_cron tests, which need a cron DB. |
| A5 with pg_cron | 7/7. The first concurrent attempt on a freshly started pg_cron container timed out once; this did not reproduce, and 21/21 passed concurrently afterwards. |
| B1/B2 equivalence | `referenceRuntimeEquivalence`, `runtimeBridgeSdk`, `runtimeBridge.postgres`, SDK `protocol` and `bridge`: all pass inside the full run. No B1/B2 file is in the diff. |
| tsc / eslint / `next build` | clean. The build lists the three new `ƒ /world-entry/stream*` routes. |
| Secret scan (staged files) | 0 hits. The plaintext scan of evidence, test logs and Postgres server logs also found 0 hits. |

## 8. Diff (`0efb04c`, 15 files, +1713/−6)
- **New:**
  - `supabase/migrations/043_world_stream_capability_authority.sql`
  - `lib/worldEntry/streamCapability.ts`
  - three route files under `app/world-entry/stream/`
  - three test files
  - `docs/evidence/worldk-m14b3/{postgres-proofs,browser-proof}.json`
- **Modified, all additive:**
  - `authorityDb.ts`: six codes and two methods
  - `deps.ts`: `getStreamCapabilityDeps`
  - `machineIngress.ts`: three exact paths
  - `run-platform-migrations.js`: 043 in the order list and Preview-only
  - `package.json`: test lists
- **Frozen files untouched:** `gateway.ts`, the status page, 040–042 and every B1/B2 file.

## 9. Scope, limits and open items
- **The positive path was not exercised on the deployment.** A real IN_WORLD RuntimeSession on Preview needs a WorldK-issued entry (machine key plus visitor session), which would need the WorldK/Vercel bypass machinery. The owner asked not to introduce that merely for B3. The positive path is certified on real Postgres and real Chromium with the production handler code. The deployment proves the routes, host gate, Origin gate, DB wiring (403 rather than 503) and 043 privileges.
- **The stub page renders for any well-formed cookie.** Issuance is what enforces IN_WORLD, so this is presentation only.
- **Capability rows are never deleted.** A retention purge of expired rows is an owner decision, like the pg_cron run-log retention.
- **`authorization_sha256` is inert.** No function accepts it. Its meaning belongs to the future allocation/signalling layer (B4 or later, owner decision).
- **Physical signalling topology remains UNFROZEN** (B0).
- **The report lives in the Platform repo, not worldk-web** (where B1/B2's reports went), because this mission said not to modify WorldK. This report commit is **local, not pushed**, because a push would redeploy Preview.

## 10. STOP
No Pixel Streaming, Unreal, TURN/STUN, renderer/GPU allocation, WorldK change, Production change, topology freeze or B4 work was done.

```
M14B3_STREAM_CAPABILITY_AUTHORITY_CERTIFIED
```
